import 'server-only';
import nodemailer, { Transporter } from 'nodemailer';
import { env } from '@/lib/env';
import { buildSupportEmail, SupportEmailPayload, sanitizeHeader } from '../templates/supportEmailTemplates';

// Strict server recipient configuration
export const TRUSTED_ROUTING = {
  feedbackEnquirySupport: [
    'support.sentimate@gmail.com',
    'sagardatkhile.official@gmail.com',
  ],
  bugReport: [
    'support.sentimate@gmail.com',
  ],
};

export interface SendMailResult {
  status: 'sent' | 'failed' | 'mocked';
  recipients: string[];
  error?: string | null;
  messageId?: string;
  attempts: number;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isTestMode = process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true';

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (this.isTestMode) {
      return;
    }

    const host = process.env.SMTP_HOST || env.smtp.host;
    const port = parseInt(process.env.SMTP_PORT || String(env.smtp.port), 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER || env.smtp.user;
    const pass = process.env.SMTP_PASS || env.smtp.pass;

    if (!host || !user) {
      // Inactive / unconfigured mode
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000, // 10s
      greetingTimeout: 5000,    // 5s
      socketTimeout: 15000,     // 15s
    });
  }

  /**
   * Determine authoritative recipient addresses based on validated submission category.
   */
  getRecipientsForCategory(category: string): string[] {
    const isBug = category === 'bug' || category.includes('bug');
    if (isBug) {
      return [...TRUSTED_ROUTING.bugReport];
    }
    return [...TRUSTED_ROUTING.feedbackEnquirySupport];
  }

  /**
   * Send support, feedback, enquiry, or bug notification email.
   * Never throws uncaught exceptions; returns structured delivery result.
   */
  async sendInquiryNotification(payload: SupportEmailPayload): Promise<SendMailResult> {
    const recipients = this.getRecipientsForCategory(payload.category);
    const emailData = buildSupportEmail(payload);

    const fromAddress = process.env.SUPPORT_FROM_EMAIL || env.smtp.fromEmail;
    const replyTo = payload.submitterEmail ? sanitizeHeader(payload.submitterEmail) : undefined;

    // Check if test mode or SMTP not configured
    const isConfigured = Boolean(
      process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)
    );

    if (this.isTestMode || !isConfigured) {
      console.log(`[EmailService:MOCK] Simulated email delivery to [${recipients.join(', ')}] for Ref: ${payload.referenceId}`);
      console.log(`  Subject: ${emailData.subject}`);
      console.log(`  Reply-To: ${replyTo || 'None'}`);

      return {
        status: 'mocked',
        recipients,
        attempts: 1,
        messageId: `mock-${Date.now()}-${payload.referenceId}`,
      };
    }

    if (!this.transporter) {
      this.initTransporter();
    }

    if (!this.transporter) {
      return {
        status: 'failed',
        recipients,
        attempts: 1,
        error: 'SMTP transporter could not be initialized. Missing host or credentials.',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: fromAddress,
        to: recipients,
        replyTo,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      });

      return {
        status: 'sent',
        recipients,
        messageId: info.messageId,
        attempts: 1,
      };
    } catch (err: any) {
      console.error(`[EmailService] SMTP delivery failed for ${payload.referenceId}:`, err?.message);
      return {
        status: 'failed',
        recipients,
        attempts: 1,
        error: err?.message || 'SMTP delivery exception',
      };
    }
  }

  /**
   * Check connection status
   */
  async verifyConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.transporter) {
      return { ok: false, message: 'SMTP not configured in environment.' };
    }
    try {
      await this.transporter.verify();
      return { ok: true, message: 'SMTP connection verified successfully.' };
    } catch (err: any) {
      return { ok: false, message: err?.message || 'SMTP verification failed.' };
    }
  }
}

export const emailService = new EmailService();

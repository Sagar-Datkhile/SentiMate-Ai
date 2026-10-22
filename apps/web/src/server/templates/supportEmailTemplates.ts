export interface SupportEmailPayload {
  referenceId: string;
  category: 'feedback' | 'enquiry' | 'support' | 'bug' | string;
  subject: string;
  message: string;
  submitterName?: string | null;
  submitterEmail?: string | null;
  timestamp?: string;
  reproductionSteps?: string | null;
  expectedBehavior?: string | null;
  actualBehavior?: string | null;
  diagnosticContext?: Record<string, any> | null;
  adminUrl?: string | null;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeHeader(str: string): string {
  // Prevent email header injection by stripping carriage returns and newlines
  return str.replace(/[\r\n]+/g, ' ').trim();
}

export function formatLineBreaks(str: string): string {
  return escapeHtml(str).replace(/\n/g, '<br/>');
}

export function buildSupportEmail(payload: SupportEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const {
    referenceId,
    category,
    subject: rawSubject,
    message,
    submitterName,
    submitterEmail,
    timestamp = new Date().toISOString(),
    reproductionSteps,
    expectedBehavior,
    actualBehavior,
    diagnosticContext,
    adminUrl,
  } = payload;

  const isBug = category === 'bug' || category.includes('bug');
  const cleanSubject = sanitizeHeader(rawSubject);

  let prefix = '[Sentimate Support]';
  let categoryLabel = 'Support Inquiry';

  if (isBug) {
    prefix = '[Sentimate Bug]';
    categoryLabel = 'Bug Report';
  } else if (category === 'feedback') {
    prefix = '[Sentimate Feedback]';
    categoryLabel = 'Feedback & Suggestion';
  } else if (category === 'enquiry') {
    prefix = '[Sentimate Enquiry]';
    categoryLabel = 'Campus Enquiry';
  }

  const emailSubject = `${prefix} ${referenceId} — ${cleanSubject}`;

  // Formatted date
  const dateFormatted = new Date(timestamp).toUTCString();

  // HTML content
  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#F4F4F6" style="padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 20px 24px; border-bottom: 1px solid #E5E7EB; background-color: #FAFAFA;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="font-size: 19px; font-weight: 700; color: #18191B; letter-spacing: -0.3px;">
                      Senti<span style="color: #2C67C5;">Mate</span>
                    </span>
                    <span style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 10px; padding: 2px 8px; background-color: #F3F4F6; border-radius: 4px; display: inline-block;">
                      ${categoryLabel}
                    </span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="font-family: monospace; font-size: 12px; font-weight: 600; color: #2C67C5; background-color: #EEF2F8; padding: 4px 8px; border-radius: 4px; border: 1px solid #D5DFEE;">
                      ${escapeHtml(referenceId)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metadata Box -->
          <tr>
            <td style="padding: 16px 24px; background-color: #FFFFFF; border-bottom: 1px solid #F3F4F6;">
              <table width="100%" border="0" cellspacing="0" cellpadding="4" style="font-size: 12px; color: #4B5563;">
                <tr>
                  <td width="110" style="font-weight: 600; color: #6B7280;">Submitter:</td>
                  <td style="color: #111827; font-weight: 500;">
                    ${submitterName ? escapeHtml(submitterName) : 'Student User'}
                    ${submitterEmail ? `(&lt;<a href="mailto:${escapeHtml(submitterEmail)}" style="color: #2C67C5; text-decoration: none;">${escapeHtml(submitterEmail)}</a>&gt;)` : ''}
                  </td>
                </tr>
                <tr>
                  <td width="110" style="font-weight: 600; color: #6B7280;">Timestamp:</td>
                  <td style="color: #374151;">${dateFormatted}</td>
                </tr>
                <tr>
                  <td width="110" style="font-weight: 600; color: #6B7280;">Subject:</td>
                  <td style="color: #111827; font-weight: 600;">${escapeHtml(cleanSubject)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 24px;">
              <div style="font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                Description / Message:
              </div>
              <div style="background-color: #F9FAFB; border-left: 3px solid #2C67C5; padding: 16px; border-radius: 4px; font-size: 13px; line-height: 1.6; color: #1F2937; word-break: break-word;">
                ${formatLineBreaks(message)}
              </div>

              ${reproductionSteps ? `
              <div style="margin-top: 16px;">
                <div style="font-size: 12px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Steps to Reproduce:
                </div>
                <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; padding: 12px; border-radius: 4px; font-size: 12px; line-height: 1.6; color: #374151; word-break: break-word;">
                  ${formatLineBreaks(reproductionSteps)}
                </div>
              </div>` : ''}

              ${(expectedBehavior || actualBehavior) ? `
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 16px;">
                <tr>
                  ${expectedBehavior ? `
                  <td width="48%" valign="top" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 12px;">
                    <div style="font-size: 11px; font-weight: 600; color: #059669; text-transform: uppercase; margin-bottom: 4px;">
                      Expected Behavior
                    </div>
                    <div style="font-size: 12px; line-height: 1.5; color: #374151;">
                      ${formatLineBreaks(expectedBehavior)}
                    </div>
                  </td>` : ''}
                  ${(expectedBehavior && actualBehavior) ? '<td width="4%">&nbsp;</td>' : ''}
                  ${actualBehavior ? `
                  <td width="48%" valign="top" style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 4px; padding: 12px;">
                    <div style="font-size: 11px; font-weight: 600; color: #DC2626; text-transform: uppercase; margin-bottom: 4px;">
                      Actual Behavior
                    </div>
                    <div style="font-size: 12px; line-height: 1.5; color: #374151;">
                      ${formatLineBreaks(actualBehavior)}
                    </div>
                  </td>` : ''}
                </tr>
              </table>` : ''}

              ${diagnosticContext && Object.keys(diagnosticContext).length > 0 ? `
              <div style="margin-top: 16px;">
                <div style="font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                  Consented Technical Diagnostics:
                </div>
                <div style="background-color: #F3F4F6; border-radius: 4px; padding: 10px; font-family: monospace; font-size: 11px; color: #4B5563; overflow-x: auto;">
                  ${Object.entries(diagnosticContext).map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`).join('')}
                </div>
              </div>` : ''}

              ${adminUrl ? `
              <div style="margin-top: 24px; text-align: center;">
                <a href="${escapeHtml(adminUrl)}" style="display: inline-block; background-color: #2C67C5; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none; padding: 11px 22px; border-radius: 6px; box-shadow: 0 1px 2px rgba(44,103,197,0.2);">
                  Manage in SentiMate Admin Panel &rarr;
                </a>
              </div>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background-color: #FAFAFA; border-top: 1px solid #E5E7EB; font-size: 11px; color: #6B7280; line-height: 1.5;">
              <p style="margin: 0;">
                This is an automated notification from the <strong>SentiMate</strong> campus platform.
              </p>
              <p style="margin: 4px 0 0 0; color: #9CA3AF; font-size: 10px;">
                Strict Privacy Invariant: Confidential student check-ins, messages, and counsellor case notes are strictly excluded.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // Plain-text alternative
  let text = `===================================================================
SENTIMATE ${categoryLabel.toUpperCase()}
Reference ID: ${referenceId}
===================================================================

Submitter: ${submitterName || 'Student User'}${submitterEmail ? ` <${submitterEmail}>` : ''}
Timestamp: ${dateFormatted}
Category:  ${category}
Subject:   ${cleanSubject}

-------------------------------------------------------------------
DESCRIPTION / MESSAGE:
-------------------------------------------------------------------
${message}
`;

  if (reproductionSteps) {
    text += `\n-------------------------------------------------------------------
STEPS TO REPRODUCE:
-------------------------------------------------------------------
${reproductionSteps}\n`;
  }

  if (expectedBehavior) {
    text += `\nExpected Behavior: ${expectedBehavior}`;
  }
  if (actualBehavior) {
    text += `\nActual Behavior:   ${actualBehavior}`;
  }

  if (diagnosticContext && Object.keys(diagnosticContext).length > 0) {
    text += `\n\n-------------------------------------------------------------------
CONSENTED TECHNICAL DIAGNOSTICS:
-------------------------------------------------------------------
${Object.entries(diagnosticContext).map(([k, v]) => `${k}: ${v}`).join('\n')}\n`;
  }

  if (adminUrl) {
    text += `\n-------------------------------------------------------------------
Admin Management Link (Requires Authentication):
${adminUrl}\n`;
  }

  text += `\n===================================================================
Confidential automated notification from SentiMate. Private chat reflections are never attached.
===================================================================`;

  return {
    subject: emailSubject,
    html,
    text,
  };
}

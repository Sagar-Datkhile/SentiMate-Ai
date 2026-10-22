import { z } from 'zod';

// ============================================================================
// ROLES & AUTH
// ============================================================================
export const UserRoleSchema = z.enum(['student', 'counsellor', 'admin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SignUpRequestSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name is required')
});
export type SignUpRequest = z.infer<typeof SignUpRequestSchema>;

export const SignInRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
export type SignInRequest = z.infer<typeof SignInRequestSchema>;

// Counsellor Provisioning Schema (Admin-Only)
export const ProvisionCounsellorRequestSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  title: z.string().default('Campus Counsellor'),
  specialization: z.string().optional(),
  officeLocation: z.string().min(1, 'Office location is required'),
  phone: z.string().optional(),
  institutionId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional()
});
export type ProvisionCounsellorRequest = z.infer<typeof ProvisionCounsellorRequestSchema>;

// ============================================================================
// STUDENT PROFILE & SEMESTER RESULTS
// ============================================================================
export const SemesterResultSchema = z.object({
  semesterNumber: z.number().int().min(1).max(8),
  sgpa: z.number().min(0).max(10).nullable(),
  verified: z.boolean().default(false)
});
export type SemesterResult = z.infer<typeof SemesterResultSchema>;

// ============================================================================
// USERNAME NORMALIZATION & POLICY
// ============================================================================
/**
 * Canonical Username Normalization
 * Enforced uniformly across UI, API, Bloom filter, and database.
 */
export function normalizeUsername(input: string): string {
  if (!input) return '';
  return input.trim().toLowerCase();
}

/**
 * System-reserved usernames prohibited from student registration.
 */
export const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'support',
  'sentimate',
  'counsellor',
  'counselor',
  'system',
  'api',
  'help',
  'moderator',
  'root',
  'staff',
  'emergency',
  'wellness',
  'security',
  'info',
  'null',
  'undefined',
  'bot',
  'ai',
]);

export interface UsernameValidationResult {
  isValid: boolean;
  normalized: string;
  error?: string;
  isReserved?: boolean;
}

/**
 * Validates username against SentiMate canonical policy:
 * - 3 to 30 characters
 * - lowercase ASCII letters (a-z), digits (0-9), underscores (_), hyphens (-)
 * - not a reserved system name
 */
export function validateUsernameFormat(raw: string): UsernameValidationResult {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return { isValid: false, normalized: '', error: 'Username cannot be empty or whitespace.' };
  }
  if (normalized.length < 3) {
    return { isValid: false, normalized, error: 'Username must be at least 3 characters long.' };
  }
  if (normalized.length > 30) {
    return { isValid: false, normalized, error: 'Username cannot exceed 30 characters.' };
  }
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'Username can only contain lowercase letters, numbers, underscores (_), and hyphens (-).',
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      isValid: false,
      normalized,
      isReserved: true,
      error: `'${normalized}' is a reserved system name and cannot be registered.`,
    };
  }
  return { isValid: true, normalized };
}

export const UsernameAvailabilityStatusSchema = z.enum([
  'available',
  'already_taken',
  'invalid_format',
  'reserved',
  'current_user',
  'unable_to_check',
]);
export type UsernameAvailabilityStatus = z.infer<typeof UsernameAvailabilityStatusSchema>;

export const UsernameAvailabilityResponseSchema = z.object({
  username: z.string(),
  available: z.boolean(),
  appears_available: z.boolean(),
  is_current: z.boolean().default(false),
  status: UsernameAvailabilityStatusSchema,
  message: z.string().optional(),
  checked_via: z.enum(['cache', 'bloom_negative', 'db_lookup', 'client_validation', 'fallback']),
});
export type UsernameAvailabilityResponse = z.infer<typeof UsernameAvailabilityResponseSchema>;

export const StudentProfileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  avatarUrl: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    })
    .refine(
      (val) => {
        if (val === null || val === undefined) return true;
        try {
          const parsed = new URL(val);
          return (
            parsed.protocol === 'https:' &&
            !parsed.username &&
            !parsed.password
          );
        } catch {
          return false;
        }
      },
      {
        message: 'Avatar URL must be a valid secure HTTPS URL without embedded credentials',
      }
    )
    .optional(),
  username: z
    .string()
    .transform(normalizeUsername)
    .refine((val) => !val || validateUsernameFormat(val).isValid, {
      message: 'Invalid username format or reserved system name',
    })
    .nullable()
    .optional(),
  prn: z.string().min(1, 'PRN is required').optional(),
  admissionYear: z.number().int().min(2000).max(2100).optional(),
  currentSemester: z.number().int().min(1).max(8).optional(),
  about: z.string().max(1000).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  semesters: z.array(SemesterResultSchema).length(8).optional()
});
export type StudentProfileUpdate = z.infer<typeof StudentProfileUpdateSchema>;

// ============================================================================
// CHAT & CONVERSATIONS
// ============================================================================
export const ChatMessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  senderRole: ChatMessageRoleSchema,
  content: z.string(),
  modelVersion: z.string().nullable().optional(),
  createdAt: z.string()
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const SendMessageRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(4000)
});
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

// ============================================================================
// WELLBEING CHECK-INS
// ============================================================================
export const WellbeingCheckinSchema = z.object({
  id: z.string().uuid().optional(),
  moodScore: z.number().int().min(1).max(5).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  stressLevel: z.number().int().min(1).max(5).nullable().optional(),
  energyLevel: z.number().int().min(1).max(5).nullable().optional(),
  socialConnectedness: z.number().int().min(1).max(5).nullable().optional(),
  academicPressure: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  sharedWithCounsellor: z.boolean().default(false)
});
export type WellbeingCheckin = z.infer<typeof WellbeingCheckinSchema>;

// ============================================================================
// REFERRALS & CASE MANAGEMENT
// ============================================================================
export const ReferralPrioritySchema = z.enum(['routine', 'medium', 'urgent']);
export type ReferralPriority = z.infer<typeof ReferralPrioritySchema>;

export const CaseStatusSchema = z.enum([
  'submitted',
  'acknowledged',
  'contacted',
  'in_progress',
  'follow_up',
  'resolved',
  'closed'
]);
export type CaseStatus = z.infer<typeof CaseStatusSchema>;

export const CreateReferralRequestSchema = z.object({
  reason: z.string().min(10, 'Please describe why you are requesting support'),
  preferredCounsellorId: z.string().uuid().optional(),
  shareRecentCheckins: z.boolean().default(true),
  shareAcademicHistory: z.boolean().default(false),
  priority: ReferralPrioritySchema.default('routine')
});
export type CreateReferralRequest = z.infer<typeof CreateReferralRequestSchema>;

export const UpdateCaseRequestSchema = z.object({
  caseId: z.string().uuid(),
  status: CaseStatusSchema,
  counsellorAssessment: z.string().optional(),
  priority: ReferralPrioritySchema.optional(),
  nextFollowUpDate: z.string().nullable().optional(),
  reopenReason: z.string().optional(),
  comment: z.string().optional()
});
export type UpdateCaseRequest = z.infer<typeof UpdateCaseRequestSchema>;

export const CreateCaseNoteRequestSchema = z.object({
  caseId: z.string().uuid(),
  title: z.string().min(1),
  noteContent: z.string().min(1),
  isConfidential: z.boolean().default(true)
});
export type CreateCaseNoteRequest = z.infer<typeof CreateCaseNoteRequestSchema>;

// ============================================================================
// APPOINTMENTS & AVAILABILITY
// ============================================================================
export const AppointmentStatusSchema = z.enum([
  'requested',
  'confirmed',
  'cancelled',
  'rescheduled',
  'completed',
  'no_show'
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

export const CreateAvailabilitySlotSchema = z.object({
  slotStart: z.string().datetime(),
  slotEnd: z.string().datetime()
});
export type CreateAvailabilitySlot = z.infer<typeof CreateAvailabilitySlotSchema>;

export const BookAppointmentRequestSchema = z.object({
  counsellorId: z.string().uuid(),
  slotId: z.string().uuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  studentNotes: z.string().max(500).optional()
});
export type BookAppointmentRequest = z.infer<typeof BookAppointmentRequestSchema>;

// ============================================================================
// ML MICROSERVICE CONTRACTS (FASTAPI & SHAP)
// ============================================================================
export const RiskLevelSchema = z.enum(['low', 'moderate', 'elevated', 'high']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ShapExplanationSchema = z.object({
  feature: z.string(),
  shapValue: z.number(),
  featureValue: z.union([z.string(), z.number()]),
  humanExplanation: z.string(),
  importanceRank: z.number().int()
});
export type ShapExplanation = z.infer<typeof ShapExplanationSchema>;

export const MlAnalyzeRequestSchema = z.object({
  text: z.string().min(1),
  studentContext: z
    .object({
      currentSemester: z.number().optional(),
      sgpaAvg: z.number().optional(),
      recentMoodAvg: z.number().optional(),
      recentStressAvg: z.number().optional()
    })
    .optional()
});
export type MlAnalyzeRequest = z.infer<typeof MlAnalyzeRequestSchema>;

export const MlAnalyzeResponseSchema = z.object({
  isAvailable: z.boolean(),
  serviceStatus: z.string(),
  textSignals: z
    .object({
      sentiment: z.string(),
      sentimentScore: z.number(),
      emotions: z.record(z.number()),
      linguisticCues: z.array(z.string()),
      modelCheckpoint: z.string()
    })
    .optional(),
  supportAssessment: z
    .object({
      riskLevel: RiskLevelSchema,
      confidenceScore: z.number(),
      modelVersion: z.string(),
      isRulesBasedFallback: z.boolean()
    })
    .optional(),
  shapExplanations: z.array(ShapExplanationSchema).optional(),
  notice: z.string().optional()
});
export type MlAnalyzeResponse = z.infer<typeof MlAnalyzeResponseSchema>;

// ============================================================================
// STUDENT SETTINGS & USER PREFERENCES CONTRACTS
// ============================================================================
export const ThemePreferenceSchema = z.enum(['light', 'dark']);
export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

export const TextSizePreferenceSchema = z.enum(['small', 'default', 'large']);
export type TextSizePreference = z.infer<typeof TextSizePreferenceSchema>;

export const ResponseLengthPreferenceSchema = z.enum(['concise', 'balanced', 'detailed']);
export type ResponseLengthPreference = z.infer<typeof ResponseLengthPreferenceSchema>;

export const UserPreferencesSchema = z.object({
  theme: ThemePreferenceSchema.default('dark'),
  textSize: TextSizePreferenceSchema.default('default'),
  reducedAnimations: z.boolean().default(false),
  enterToSend: z.boolean().default(true),
  responseLanguage: z.string().default('English'),
  responseLength: ResponseLengthPreferenceSchema.default('balanced'),
  emailAppointmentReminders: z.boolean().default(true),
  emailCounsellorUpdates: z.boolean().default(true),
  inAppAppointmentReminders: z.boolean().default(true),
  inAppCounsellorUpdates: z.boolean().default(true),
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const UpdateUserPreferencesSchema = UserPreferencesSchema.partial();
export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>;

export const ConsentTypeSchema = z.enum([
  'ai_chat_processing',
  'nlp_sentiment_analysis',
  'counsellor_data_sharing',
  'academic_record_correlation',
]);
export type ConsentType = z.infer<typeof ConsentTypeSchema>;

export const ConsentStatusSchema = z.enum(['granted', 'revoked']);
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>;

export const UpdateConsentRequestSchema = z.object({
  consentType: ConsentTypeSchema,
  status: ConsentStatusSchema,
  termsVersion: z.string().default('1.0'),
});
export type UpdateConsentRequest = z.infer<typeof UpdateConsentRequestSchema>;

export const SupportCategorySchema = z.enum([
  'feedback',
  'enquiry',
  'support',
  'bug',
  'general',
  'counsellor',
  'account',
  'privacy',
  'chat_bug',
  'appointments_bug',
  'appearance_bug',
  'performance_bug',
]);
export type SupportCategory = z.infer<typeof SupportCategorySchema>;

export const BugPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type BugPriority = z.infer<typeof BugPrioritySchema>;

export const BugStatusSchema = z.enum(['new', 'in_progress', 'resolved', 'closed']);
export type BugStatus = z.infer<typeof BugStatusSchema>;

export const EmailDeliveryStatusSchema = z.enum(['queued', 'sent', 'failed']);
export type EmailDeliveryStatus = z.infer<typeof EmailDeliveryStatusSchema>;

export const SupportInquiryRequestSchema = z.object({
  inquiryType: z.string().optional(),
  category: SupportCategorySchema.default('support'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(120, 'Subject cannot exceed 120 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(4000, 'Message cannot exceed 4000 characters'),
  reproductionSteps: z.string().max(2000, 'Reproduction steps cannot exceed 2000 characters').optional(),
  expectedBehavior: z.string().max(1000, 'Expected behavior cannot exceed 1000 characters').optional(),
  actualBehavior: z.string().max(1000, 'Actual behavior cannot exceed 1000 characters').optional(),
  includeDiagnosticContext: z.boolean().default(false),
  diagnosticContext: z.record(z.any()).optional(),
  idempotencyKey: z.string().max(100).optional(),
});
export type SupportInquiryRequest = z.infer<typeof SupportInquiryRequestSchema>;

export const UpdateBugTriageSchema = z.object({
  status: BugStatusSchema.optional(),
  priority: BugPrioritySchema.optional(),
  internalNotes: z.string().max(5000, 'Internal notes cannot exceed 5000 characters').optional(),
});
export type UpdateBugTriage = z.infer<typeof UpdateBugTriageSchema>;

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>;

export const DeleteAccountRequestSchema = z.object({
  confirmation: z.literal('DELETE'),
  password: z.string().optional(),
});
export type DeleteAccountRequest = z.infer<typeof DeleteAccountRequestSchema>;


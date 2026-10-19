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

export const StudentProfileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and hyphens')
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

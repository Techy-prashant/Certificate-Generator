export type UserRole = 'super_admin' | 'certificate_admin' | 'reviewer';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  websiteUrl?: string;
  publicVerificationEnabled: boolean;
  createdAt: string;
}

export type EventCategory = 'Technology' | 'Debate' | 'Cultural' | 'Music' | 'Sports' | 'Other';
export type EventScope = 'House-level' | 'Inter-house' | 'Pan-Namdapha';
export type EventStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface Event {
  id: string;
  name: string;
  description?: string;
  category: EventCategory;
  scope: EventScope;
  eventDate: string;
  status: EventStatus;
  defaultTemplateId?: string;
  issuanceApprovalRequired: boolean;
  createdByName: string;
  createdAt: string;
}

export interface AwardCategory {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  templateId?: string;
  status: 'active' | 'inactive';
}

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type TemplateOrientation = 'landscape' | 'portrait';

export interface TemplateFieldConfig {
  id: string;
  name: string;
  type: 'recipient_name' | 'event_name' | 'achievement' | 'date' | 'qr_code' | 'verification_code' | 'signatory' | 'static_text';
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  alignment: 'left' | 'center' | 'right';
  isRequired: boolean;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  backgroundUrl: string;
  pageWidth: number;
  pageHeight: number;
  pageUnit: 'px' | 'mm' | 'in';
  orientation: TemplateOrientation;
  fieldConfiguration: TemplateFieldConfig[];
  versionNumber: number;
  status: TemplateStatus;
  createdAt: string;
  publishedAt?: string;
}

export type SignatoryStatus = 'active' | 'inactive';

export interface Signatory {
  id: string;
  name: string;
  designation: string;
  signatureAssetUrl: string;
  status: SignatoryStatus;
  usagePermissions?: string;
  createdAt: string;
}

export type CertificateStatus = 'issued' | 'revoked';

export interface Certificate {
  id: string;
  verificationCode: string; // 6 digits
  eventId: string;
  eventName: string;
  awardCategoryId: string;
  awardCategoryName: string;
  templateId: string;
  templateVersion: number;
  recipientName: string;
  recipientEmail?: string;
  achievement: string;
  organizationName: string;
  issueDate: string;
  issuedAt: string;
  issuedByName: string;
  status: CertificateStatus;
  revocationDate?: string;
  revocationReasonPublic?: string;
  revocationReasonInternal?: string;
  signatoriesCount: number;
  pdfDownloadAvailable: boolean;
}

export type BatchStatus = 'draft' | 'validating' | 'awaiting_approval' | 'processing' | 'completed' | 'partially_completed' | 'failed';

export interface IssuanceBatch {
  id: string;
  eventId: string;
  eventName: string;
  status: BatchStatus;
  originalFilename: string;
  totalRows: number;
  validRows: number;
  issuedCount: number;
  failedCount: number;
  createdByName: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetDescription: string;
  ipAddress?: string;
  createdAt: string;
}

export interface PublicVerificationResult {
  isValid: boolean;
  status: CertificateStatus | 'not_found';
  recipientName?: string;
  eventName?: string;
  achievement?: string;
  organizationName?: string;
  issueDate?: string;
  verificationCode?: string;
  revocationDate?: string;
  revocationReasonPublic?: string;
}

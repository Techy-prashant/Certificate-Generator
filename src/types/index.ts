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

export type EventCategory = 'Impact' | 'Cultural' | 'Sport' | 'Technical';
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
  defaultTemplateName?: string;
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
  templateName?: string;
  status: 'active' | 'inactive';
}

export interface EventSignatory {
  id: string;
  eventId: string;
  signatoryId: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatureAssetUrl: string;
  awardCategoryId?: string;
  awardCategoryName?: string;
  displayOrder: number;
  createdAt: string;
}

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type TemplateOrientation = 'landscape' | 'portrait';

export type TemplateFieldType =
  | 'recipient_name'
  | 'event_name'
  | 'achievement'
  | 'position'
  | 'date'
  | 'organization_name'
  | 'verification_code'
  | 'qr_code'
  | 'signatory'
  | 'signatory_name'
  | 'signatory_designation'
  | 'static_text';

export interface TemplateFieldConfig {
  id: string;
  name: string;
  type: TemplateFieldType;
  x: number; // in mm relative to top-left
  y: number; // in mm relative to top-left
  width: number; // in mm
  height: number; // in mm
  fontSize: number; // in pt
  fontFamily: string;
  fontWeight?: 'normal' | 'bold' | string;
  color: string;
  alignment: 'left' | 'center' | 'right';
  isRequired: boolean;
  letterSpacing?: number;
  overflowBehavior?: 'wrap' | 'shrink' | 'clip';
  staticTextContent?: string;
  signatoryIndex?: number; // 0 for 1st signatory, 1 for 2nd, etc.
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  backgroundUrl: string;
  backgroundStoragePath?: string;
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
  signatureStoragePath?: string;
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

export interface IssueCertificateInput {
  eventId: string;
  awardCategoryId: string;
  templateId: string;
  recipientName: string;
  recipientEmail?: string;
  achievement: string;
  issueDate: string;
  signatoryIds: string[];
}

export interface CertificateDetails {
  certificate: Certificate;
  templateSnapshot: {
    templateId: string;
    templateName: string;
    versionNumber: number;
    backgroundUrl?: string;
    backgroundStoragePath?: string;
    pageWidth: number;
    pageHeight: number;
    pageUnit: 'px' | 'mm' | 'in';
    orientation: TemplateOrientation;
    fieldConfiguration: TemplateFieldConfig[];
  };
  signatorySnapshot: Array<{
    signatoryId: string;
    name: string;
    designation: string;
    signatureAssetUrl?: string;
    signatureStoragePath?: string;
    displayOrder: number;
  }>;
}

export type BatchStatus = 'draft' | 'validating' | 'awaiting_approval' | 'approved' | 'processing' | 'completed' | 'partially_completed' | 'failed' | 'cancelled';

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
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetDescription: string;
  metadata?: Record<string, any>;
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

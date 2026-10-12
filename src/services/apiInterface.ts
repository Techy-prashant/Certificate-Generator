import {
  Event,
  AwardCategory,
  EventSignatory,
  Template,
  TemplateFieldConfig,
  TemplateOrientation,
  TemplateStatus,
  Signatory,
  SignatoryStatus,
  Certificate,
  IssueCertificateInput,
  CertificateDetails,
  BatchStatus,
  IssuanceBatch,
  AuditLog,
  PublicVerificationResult,
  UserProfile,
  OrganizationSettings
} from '../types';

export interface CertificatePortalService {
  isMock: boolean;
  getOrganizationSettings(): Promise<OrganizationSettings>;
  getCurrentUser(): Promise<UserProfile | null>;
  
  // Public Verification
  verifyCertificate(code: string): Promise<PublicVerificationResult>;
  
  // Events
  getEvents(): Promise<Event[]>;
  getEventById(id: string): Promise<Event | null>;
  createEvent(event: Omit<Event, 'id' | 'createdAt' | 'createdByName'>): Promise<Event>;
  updateEvent(id: string, updates: Partial<Omit<Event, 'id' | 'createdAt' | 'createdByName'>>): Promise<Event>;
  archiveEvent(id: string): Promise<boolean>;

  // Award Categories
  getAwardCategories(eventId: string): Promise<AwardCategory[]>;
  createAwardCategory(category: Omit<AwardCategory, 'id'>): Promise<AwardCategory>;
  updateAwardCategory(id: string, updates: Partial<Omit<AwardCategory, 'id' | 'eventId'>>): Promise<AwardCategory>;
  deleteAwardCategory(id: string): Promise<boolean>;

  // Event Signatories (Binding signatories to events and categories)
  getEventSignatories(eventId: string): Promise<EventSignatory[]>;
  addEventSignatory(binding: {
    eventId: string;
    signatoryId: string;
    awardCategoryId?: string;
    displayOrder?: number;
  }): Promise<EventSignatory>;
  removeEventSignatory(id: string): Promise<boolean>;
  updateEventSignatoryOrder(id: string, displayOrder: number): Promise<boolean>;
  
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplateById(id: string): Promise<Template | null>;
  createTemplate(
    templateData: {
      name: string;
      description?: string;
      category?: string;
      pageWidth: number;
      pageHeight: number;
      pageUnit: 'px' | 'mm' | 'in';
      orientation: TemplateOrientation;
    },
    backgroundFile: File
  ): Promise<Template>;
  updateTemplateStatus(id: string, status: TemplateStatus): Promise<Template>;
  updateTemplateFields(id: string, fieldConfiguration: TemplateFieldConfig[]): Promise<Template>;
  publishTemplate(id: string): Promise<Template>;
  
  // Signatories
  getSignatories(): Promise<Signatory[]>;
  getSignatoryById(id: string): Promise<Signatory | null>;
  createSignatory(
    signatoryData: {
      name: string;
      designation: string;
      status?: SignatoryStatus;
      usagePermissions?: string;
    },
    signatureFile: File
  ): Promise<Signatory>;
  updateSignatory(
    id: string,
    updates: {
      name?: string;
      designation?: string;
      status?: SignatoryStatus;
      usagePermissions?: string;
    },
    signatureFile?: File
  ): Promise<Signatory>;
  
  // Certificates
  getCertificates(): Promise<Certificate[]>;
  getCertificateById(id: string): Promise<Certificate | null>;
  getCertificateDetails(id: string): Promise<CertificateDetails | null>;
  issueCertificate(input: IssueCertificateInput): Promise<Certificate>;
  revokeCertificate(id: string, reasonInternal: string, reasonPublic?: string): Promise<boolean>;
  
  // Batches
  getIssuanceBatches(): Promise<IssuanceBatch[]>;
  createIssuanceBatch(data: {
    eventId: string;
    originalFilename: string;
    totalRows: number;
    validRows: number;
    status?: BatchStatus;
  }): Promise<IssuanceBatch>;
  updateIssuanceBatch(
    id: string,
    updates: {
      status?: BatchStatus;
      issuedCount?: number;
      failedCount?: number;
      confirmedAt?: string;
      completedAt?: string;
    }
  ): Promise<IssuanceBatch>;
  
  // Team & Audit
  getTeamMembers(): Promise<UserProfile[]>;
  getAuditLogs(): Promise<AuditLog[]>;
}

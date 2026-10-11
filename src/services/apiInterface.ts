import {
  Event,
  AwardCategory,
  Template,
  Signatory,
  Certificate,
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
  getAwardCategories(eventId: string): Promise<AwardCategory[]>;
  
  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplateById(id: string): Promise<Template | null>;
  
  // Signatories
  getSignatories(): Promise<Signatory[]>;
  
  // Certificates
  getCertificates(): Promise<Certificate[]>;
  getCertificateById(id: string): Promise<Certificate | null>;
  revokeCertificate(id: string, reason: string): Promise<boolean>;
  
  // Batches
  getIssuanceBatches(): Promise<IssuanceBatch[]>;
  
  // Team & Audit
  getTeamMembers(): Promise<UserProfile[]>;
  getAuditLogs(): Promise<AuditLog[]>;
}

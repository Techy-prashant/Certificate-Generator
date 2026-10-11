import { CertificatePortalService } from './apiInterface';
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
import {
  mockOrgSettings,
  mockCurrentUser,
  mockTeamMembers,
  mockSignatories,
  mockTemplates,
  mockEvents,
  mockAwardCategories,
  mockCertificates,
  mockBatches,
  mockAuditLogs
} from './mockData';

class MockApiService implements CertificatePortalService {
  public isMock = true;
  private certificates: Certificate[] = [...mockCertificates];
  private events: Event[] = [...mockEvents];
  private templates: Template[] = [...mockTemplates];
  private signatories: Signatory[] = [...mockSignatories];
  private batches: IssuanceBatch[] = [...mockBatches];
  private auditLogs: AuditLog[] = [...mockAuditLogs];

  private async delay(ms: number = 150): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getOrganizationSettings(): Promise<OrganizationSettings> {
    await this.delay();
    return mockOrgSettings;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    await this.delay();
    return mockCurrentUser;
  }

  async verifyCertificate(code: string): Promise<PublicVerificationResult> {
    await this.delay(200);
    const cleanedCode = code.trim();
    const cert = this.certificates.find(c => c.verificationCode === cleanedCode);

    if (!cert) {
      return {
        isValid: false,
        status: 'not_found',
      };
    }

    if (cert.status === 'revoked') {
      return {
        isValid: false,
        status: 'revoked',
        recipientName: cert.recipientName,
        eventName: cert.eventName,
        achievement: cert.achievement,
        organizationName: cert.organizationName,
        issueDate: cert.issueDate,
        verificationCode: cert.verificationCode,
        revocationDate: cert.revocationDate,
        revocationReasonPublic: cert.revocationReasonPublic,
      };
    }

    return {
      isValid: true,
      status: 'issued',
      recipientName: cert.recipientName,
      eventName: cert.eventName,
      achievement: cert.achievement,
      organizationName: cert.organizationName,
      issueDate: cert.issueDate,
      verificationCode: cert.verificationCode,
    };
  }

  async getEvents(): Promise<Event[]> {
    await this.delay();
    return [...this.events];
  }

  async getEventById(id: string): Promise<Event | null> {
    await this.delay();
    return this.events.find(e => e.id === id) || null;
  }

  async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'createdByName'>): Promise<Event> {
    await this.delay();
    const newEvent: Event = {
      ...eventData,
      id: `evt-${Date.now()}`,
      createdByName: mockCurrentUser.displayName,
      createdAt: new Date().toISOString(),
    };
    this.events.unshift(newEvent);
    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'event.created',
      targetType: 'event',
      targetId: newEvent.id,
      targetDescription: `Created event: ${newEvent.name}`,
      createdAt: new Date().toISOString(),
    });
    return newEvent;
  }

  async getAwardCategories(eventId: string): Promise<AwardCategory[]> {
    await this.delay();
    return mockAwardCategories.filter(c => c.eventId === eventId);
  }

  async getTemplates(): Promise<Template[]> {
    await this.delay();
    return [...this.templates];
  }

  async getTemplateById(id: string): Promise<Template | null> {
    await this.delay();
    return this.templates.find(t => t.id === id) || null;
  }

  async getSignatories(): Promise<Signatory[]> {
    await this.delay();
    return [...this.signatories];
  }

  async getCertificates(): Promise<Certificate[]> {
    await this.delay();
    return [...this.certificates];
  }

  async getCertificateById(id: string): Promise<Certificate | null> {
    await this.delay();
    return this.certificates.find(c => c.id === id) || null;
  }

  async revokeCertificate(id: string, reason: string): Promise<boolean> {
    await this.delay();
    const index = this.certificates.findIndex(c => c.id === id);
    if (index === -1) return false;

    const cert = this.certificates[index];
    this.certificates[index] = {
      ...cert,
      status: 'revoked',
      revocationDate: new Date().toISOString(),
      revocationReasonPublic: reason,
      revocationReasonInternal: `Revoked by ${mockCurrentUser.displayName}: ${reason}`,
      pdfDownloadAvailable: false,
    };

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'certificate.revoked',
      targetType: 'certificate',
      targetId: cert.id,
      targetDescription: `Revoked certificate ${cert.verificationCode} (${cert.recipientName}): ${reason}`,
      createdAt: new Date().toISOString(),
    });

    return true;
  }

  async getIssuanceBatches(): Promise<IssuanceBatch[]> {
    await this.delay();
    return [...this.batches];
  }

  async getTeamMembers(): Promise<UserProfile[]> {
    await this.delay();
    return [...mockTeamMembers];
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    await this.delay();
    return [...this.auditLogs];
  }
}

export const mockApiService = new MockApiService();

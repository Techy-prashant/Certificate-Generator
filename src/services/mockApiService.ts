import { CertificatePortalService } from './apiInterface';
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
  mockAuditLogs,
  mockEventSignatories
} from './mockData';

class MockApiService implements CertificatePortalService {
  public isMock = true;
  private certificates: Certificate[] = [...mockCertificates];
  private events: Event[] = [...mockEvents];
  private awardCategories: AwardCategory[] = [...mockAwardCategories];
  private eventSignatories: EventSignatory[] = [...mockEventSignatories];
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

  async updateEvent(id: string, updates: Partial<Omit<Event, 'id' | 'createdAt' | 'createdByName'>>): Promise<Event> {
    await this.delay();
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Event not found');

    const updated = {
      ...this.events[index],
      ...updates,
    };
    this.events[index] = updated;

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'event.updated',
      targetType: 'event',
      targetId: id,
      targetDescription: `Updated event: ${updated.name}`,
      createdAt: new Date().toISOString(),
    });

    return updated;
  }

  async archiveEvent(id: string): Promise<boolean> {
    await this.delay();
    const event = this.events.find(e => e.id === id);
    if (!event) throw new Error('Event not found');
    event.status = 'archived';

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'event.archived',
      targetType: 'event',
      targetId: id,
      targetDescription: `Archived event: ${event.name}`,
      createdAt: new Date().toISOString(),
    });

    return true;
  }

  async getAwardCategories(eventId: string): Promise<AwardCategory[]> {
    await this.delay();
    return this.awardCategories.filter(c => c.eventId === eventId);
  }

  async createAwardCategory(category: Omit<AwardCategory, 'id'>): Promise<AwardCategory> {
    await this.delay();
    const newCat: AwardCategory = {
      ...category,
      id: `cat-${Date.now()}`,
      status: category.status || 'active',
    };
    this.awardCategories.push(newCat);
    return newCat;
  }

  async updateAwardCategory(id: string, updates: Partial<Omit<AwardCategory, 'id' | 'eventId'>>): Promise<AwardCategory> {
    await this.delay();
    const index = this.awardCategories.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Award category not found');

    const updated = { ...this.awardCategories[index], ...updates };
    this.awardCategories[index] = updated;
    return updated;
  }

  async deleteAwardCategory(id: string): Promise<boolean> {
    await this.delay();
    const index = this.awardCategories.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.awardCategories.splice(index, 1);
    return true;
  }

  async getEventSignatories(eventId: string): Promise<EventSignatory[]> {
    await this.delay();
    return this.eventSignatories
      .filter(es => es.eventId === eventId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async addEventSignatory(binding: {
    eventId: string;
    signatoryId: string;
    awardCategoryId?: string;
    displayOrder?: number;
  }): Promise<EventSignatory> {
    await this.delay();
    const sig = this.signatories.find(s => s.id === binding.signatoryId);
    if (!sig) throw new Error('Signatory not found');

    const cat = binding.awardCategoryId
      ? this.awardCategories.find(c => c.id === binding.awardCategoryId)
      : null;

    const newBinding: EventSignatory = {
      id: `esig-${Date.now()}`,
      eventId: binding.eventId,
      signatoryId: binding.signatoryId,
      signatoryName: sig.name,
      signatoryDesignation: sig.designation,
      signatureAssetUrl: sig.signatureAssetUrl,
      awardCategoryId: binding.awardCategoryId,
      awardCategoryName: cat?.name || 'All Categories',
      displayOrder: binding.displayOrder || this.eventSignatories.length + 1,
      createdAt: new Date().toISOString(),
    };

    this.eventSignatories.push(newBinding);
    return newBinding;
  }

  async removeEventSignatory(id: string): Promise<boolean> {
    await this.delay();
    const index = this.eventSignatories.findIndex(es => es.id === id);
    if (index === -1) return false;
    this.eventSignatories.splice(index, 1);
    return true;
  }

  async updateEventSignatoryOrder(id: string, displayOrder: number): Promise<boolean> {
    await this.delay();
    const binding = this.eventSignatories.find(es => es.id === id);
    if (!binding) return false;
    binding.displayOrder = displayOrder;
    return true;
  }

  async getTemplates(): Promise<Template[]> {
    await this.delay();
    return [...this.templates];
  }

  async getTemplateById(id: string): Promise<Template | null> {
    await this.delay();
    return this.templates.find(t => t.id === id) || null;
  }

  async createTemplate(
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
  ): Promise<Template> {
    await this.delay();
    const newTemplate: Template = {
      id: `tpl-${Date.now()}`,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category || 'General',
      backgroundUrl: URL.createObjectURL(backgroundFile),
      pageWidth: templateData.pageWidth,
      pageHeight: templateData.pageHeight,
      pageUnit: templateData.pageUnit,
      orientation: templateData.orientation,
      fieldConfiguration: [],
      versionNumber: 1,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    this.templates.unshift(newTemplate);
    return newTemplate;
  }

  async updateTemplateStatus(id: string, status: TemplateStatus): Promise<Template> {
    await this.delay();
    const template = this.templates.find(t => t.id === id);
    if (!template) throw new Error('Template not found');

    template.status = status;
    if (status === 'published') {
      template.publishedAt = new Date().toISOString();
    }
    return template;
  }

  async updateTemplateFields(id: string, fieldConfiguration: TemplateFieldConfig[]): Promise<Template> {
    await this.delay();
    const template = this.templates.find(t => t.id === id);
    if (!template) throw new Error('Template not found');

    template.fieldConfiguration = fieldConfiguration;
    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'template.fields_updated',
      targetType: 'template',
      targetId: id,
      targetDescription: `Updated field configuration (${fieldConfiguration.length} fields) for template: ${template.name}`,
      createdAt: new Date().toISOString(),
    });

    return template;
  }

  async publishTemplate(id: string): Promise<Template> {
    await this.delay();
    const template = this.templates.find(t => t.id === id);
    if (!template) throw new Error('Template not found');

    if (template.status === 'published') {
      template.versionNumber += 1;
    }
    template.status = 'published';
    template.publishedAt = new Date().toISOString();

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'template.published',
      targetType: 'template',
      targetId: id,
      targetDescription: `Published template: ${template.name} (v${template.versionNumber})`,
      createdAt: new Date().toISOString(),
    });

    return template;
  }

  async getSignatories(): Promise<Signatory[]> {
    await this.delay();
    return [...this.signatories];
  }

  async getSignatoryById(id: string): Promise<Signatory | null> {
    await this.delay();
    return this.signatories.find(s => s.id === id) || null;
  }

  async createSignatory(
    signatoryData: {
      name: string;
      designation: string;
      status?: SignatoryStatus;
      usagePermissions?: string;
    },
    signatureFile: File
  ): Promise<Signatory> {
    await this.delay();
    const newSig: Signatory = {
      id: `sig-${Date.now()}`,
      name: signatoryData.name,
      designation: signatoryData.designation,
      signatureAssetUrl: URL.createObjectURL(signatureFile),
      status: signatoryData.status || 'active',
      usagePermissions: signatoryData.usagePermissions,
      createdAt: new Date().toISOString(),
    };

    this.signatories.unshift(newSig);
    return newSig;
  }

  async updateSignatory(
    id: string,
    updates: {
      name?: string;
      designation?: string;
      status?: SignatoryStatus;
      usagePermissions?: string;
    },
    signatureFile?: File
  ): Promise<Signatory> {
    await this.delay();
    const index = this.signatories.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Signatory not found');

    const updated = {
      ...this.signatories[index],
      ...updates,
      signatureAssetUrl: signatureFile ? URL.createObjectURL(signatureFile) : this.signatories[index].signatureAssetUrl,
    };

    this.signatories[index] = updated;
    return updated;
  }

  async getCertificates(): Promise<Certificate[]> {
    await this.delay();
    return [...this.certificates];
  }

  async getCertificateById(id: string): Promise<Certificate | null> {
    await this.delay();
    return this.certificates.find((c) => c.id === id) || null;
  }

  async getCertificateDetails(id: string): Promise<CertificateDetails | null> {
    await this.delay();
    const cert = this.certificates.find((c) => c.id === id);
    if (!cert) return null;

    const template = this.templates.find((t) => t.id === cert.templateId) || this.templates[0];
    const details: CertificateDetails = {
      certificate: cert,
      templateSnapshot: {
        templateId: template.id,
        templateName: template.name,
        versionNumber: cert.templateVersion,
        backgroundUrl: template.backgroundUrl,
        pageWidth: template.pageWidth,
        pageHeight: template.pageHeight,
        pageUnit: template.pageUnit,
        orientation: template.orientation,
        fieldConfiguration: template.fieldConfiguration,
      },
      signatorySnapshot: this.signatories.slice(0, cert.signatoriesCount).map((s, idx) => ({
        signatoryId: s.id,
        name: s.name,
        designation: s.designation,
        signatureAssetUrl: s.signatureAssetUrl,
        displayOrder: idx + 1,
      })),
    };
    return details;
  }

  async issueCertificate(input: IssueCertificateInput): Promise<Certificate> {
    await this.delay();
    const event = this.events.find((e) => e.id === input.eventId);
    if (!event) throw new Error('Selected event not found');
    if (event.status === 'archived') {
      throw new Error('Cannot issue certificates for an archived event.');
    }

    const category = this.awardCategories.find((c) => c.id === input.awardCategoryId);
    if (!category) throw new Error('Selected award category not found');

    const template = this.templates.find((t) => t.id === input.templateId);
    if (!template) throw new Error('Selected template not found');

    const orderedSigs = input.signatoryIds
      .map((id) => this.signatories.find((s) => s.id === id))
      .filter(Boolean) as Signatory[];

    // 6-digit collision-safe code generator
    let code = '';
    for (let i = 0; i < 5; i++) {
      const candidate = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
      if (!this.certificates.some((c) => c.verificationCode === candidate)) {
        code = candidate;
        break;
      }
    }
    if (!code) code = `${Date.now()}`.slice(-6);

    const newCert: Certificate = {
      id: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      verificationCode: code,
      eventId: event.id,
      eventName: event.name,
      awardCategoryId: category.id,
      awardCategoryName: category.name,
      templateId: template.id,
      templateVersion: template.versionNumber,
      recipientName: input.recipientName.trim(),
      recipientEmail: input.recipientEmail?.trim(),
      achievement: input.achievement.trim(),
      organizationName: 'Namdapha House, IIT Madras BS Degree',
      issueDate: input.issueDate,
      issuedAt: new Date().toISOString(),
      issuedByName: mockCurrentUser.displayName,
      status: 'issued',
      signatoriesCount: orderedSigs.length,
      pdfDownloadAvailable: true,
    };

    this.certificates.unshift(newCert);

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'certificate.issued',
      targetType: 'certificate',
      targetId: newCert.id,
      targetDescription: `Issued certificate ${newCert.verificationCode} for "${newCert.recipientName}" in event "${event.name}"`,
      createdAt: new Date().toISOString(),
    });

    return newCert;
  }

  async revokeCertificate(id: string, reasonInternal: string, reasonPublic?: string): Promise<boolean> {
    await this.delay();
    const index = this.certificates.findIndex((c) => c.id === id);
    if (index === -1) return false;

    const cert = this.certificates[index];
    this.certificates[index] = {
      ...cert,
      status: 'revoked',
      revocationDate: new Date().toISOString(),
      revocationReasonInternal: reasonInternal,
      revocationReasonPublic: reasonPublic || reasonInternal,
      pdfDownloadAvailable: false,
    };

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'certificate.revoked',
      targetType: 'certificate',
      targetId: cert.id,
      targetDescription: `Revoked certificate ${cert.verificationCode} (${cert.recipientName}): ${reasonInternal}`,
      createdAt: new Date().toISOString(),
    });

    return true;
  }

  async getIssuanceBatches(): Promise<IssuanceBatch[]> {
    await this.delay();
    return [...this.batches];
  }

  async createIssuanceBatch(data: {
    eventId: string;
    originalFilename: string;
    totalRows: number;
    validRows: number;
    status?: BatchStatus;
  }): Promise<IssuanceBatch> {
    await this.delay();
    const event = this.events.find((e) => e.id === data.eventId);
    const newBatch: IssuanceBatch = {
      id: `batch-${Date.now()}`,
      eventId: data.eventId,
      eventName: event?.name || 'House Competition',
      status: data.status || 'draft',
      originalFilename: data.originalFilename,
      totalRows: data.totalRows,
      validRows: data.validRows,
      issuedCount: 0,
      failedCount: 0,
      createdByName: mockCurrentUser.displayName,
      createdAt: new Date().toISOString(),
    };

    this.batches.unshift(newBatch);

    this.auditLogs.unshift({
      id: `log-${Date.now()}`,
      actorName: mockCurrentUser.displayName,
      actorRole: mockCurrentUser.role,
      action: 'batch.created',
      targetType: 'batch',
      targetId: newBatch.id,
      targetDescription: `Created issuance batch "${data.originalFilename}" (${data.totalRows} rows) for ${newBatch.eventName}`,
      createdAt: new Date().toISOString(),
    });

    return newBatch;
  }

  async updateIssuanceBatch(
    id: string,
    updates: {
      status?: BatchStatus;
      issuedCount?: number;
      failedCount?: number;
      confirmedAt?: string;
      completedAt?: string;
    }
  ): Promise<IssuanceBatch> {
    await this.delay();
    const index = this.batches.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('Batch not found');

    const updated = {
      ...this.batches[index],
      ...updates,
    };
    this.batches[index] = updated;

    if (updates.status === 'completed' || updates.status === 'awaiting_approval' || updates.status === 'approved') {
      this.auditLogs.unshift({
        id: `log-${Date.now()}`,
        actorName: mockCurrentUser.displayName,
        actorRole: mockCurrentUser.role,
        action: updates.status === 'completed' ? 'batch.completed' : `batch.${updates.status}`,
        targetType: 'batch',
        targetId: id,
        targetDescription: `Updated batch status to ${updates.status} (Issued: ${updated.issuedCount}, Failed: ${updated.failedCount})`,
        createdAt: new Date().toISOString(),
      });
    }

    return updated;
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

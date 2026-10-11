import { supabase } from '../lib/supabaseClient';
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

export class SupabaseService implements CertificatePortalService {
  public isMock = false;

  private checkClient() {
    if (!supabase) {
      throw new Error('Supabase client is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
    }
    return supabase;
  }

  async getOrganizationSettings(): Promise<OrganizationSettings> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('organization_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to load organization settings');
    }

    return {
      id: data.id,
      name: data.name,
      displayName: data.display_name || data.name,
      description: data.description,
      websiteUrl: data.website_url,
      publicVerificationEnabled: data.public_verification_enabled,
      createdAt: data.created_at,
    };
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    const client = this.checkClient();
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) return null;

    const { data } = await client
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!data) return null;

    return {
      id: data.id,
      email: data.email || session.user.email || '',
      displayName: data.display_name,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  }

  // 1. Public Verification via narrow SECURITY DEFINER RPC
  async verifyCertificate(code: string): Promise<PublicVerificationResult> {
    const client = this.checkClient();
    const cleanCode = code.trim();

    const { data, error } = await client.rpc('verify_certificate', {
      p_code: cleanCode,
    });

    if (error || !data || data.length === 0) {
      return {
        isValid: false,
        status: 'not_found',
      };
    }

    const row = data[0];
    return {
      isValid: row.is_valid,
      status: row.status,
      recipientName: row.recipient_name,
      eventName: row.event_name,
      achievement: row.achievement,
      organizationName: row.organization_name,
      issueDate: row.issue_date,
      verificationCode: row.verification_code,
      revocationDate: row.revocation_date,
      revocationReasonPublic: row.revocation_reason_public,
    };
  }

  // 2. Events
  async getEvents(): Promise<Event[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('events')
      .select('*, profiles:created_by(display_name)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      scope: row.scope,
      eventDate: row.event_date,
      status: row.status,
      defaultTemplateId: row.default_template_id,
      issuanceApprovalRequired: row.issuance_approval_required,
      createdByName: row.profiles?.display_name || 'System Admin',
      createdAt: row.created_at,
    }));
  }

  async getEventById(id: string): Promise<Event | null> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('events')
      .select('*, profiles:created_by(display_name)')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      scope: data.scope,
      eventDate: data.event_date,
      status: data.status,
      defaultTemplateId: data.default_template_id,
      issuanceApprovalRequired: data.issuance_approval_required,
      createdByName: data.profiles?.display_name || 'System Admin',
      createdAt: data.created_at,
    };
  }

  async createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'createdByName'>): Promise<Event> {
    const client = this.checkClient();
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) throw new Error('Authentication required');

    const { data, error } = await client
      .from('events')
      .insert({
        name: eventData.name,
        description: eventData.description,
        category: eventData.category,
        scope: eventData.scope,
        event_date: eventData.eventDate,
        status: eventData.status,
        default_template_id: eventData.defaultTemplateId,
        issuance_approval_required: eventData.issuanceApprovalRequired,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create event');

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: session.user.id,
      action: 'event.created',
      target_type: 'event',
      target_id: data.id,
      metadata: { event_name: data.name },
    });

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      scope: data.scope,
      eventDate: data.event_date,
      status: data.status,
      defaultTemplateId: data.default_template_id,
      issuanceApprovalRequired: data.issuance_approval_required,
      createdByName: 'Current Admin',
      createdAt: data.created_at,
    };
  }

  async getAwardCategories(eventId: string): Promise<AwardCategory[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('award_categories')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      name: row.name,
      description: row.description,
      templateId: row.template_id,
      status: row.status,
    }));
  }

  // 3. Templates
  async getTemplates(): Promise<Template[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      backgroundUrl: row.background_storage_path,
      pageWidth: Number(row.page_width),
      pageHeight: Number(row.page_height),
      pageUnit: row.page_unit,
      orientation: row.orientation,
      fieldConfiguration: row.field_configuration || [],
      versionNumber: row.version_number,
      status: row.status,
      createdAt: row.created_at,
      publishedAt: row.published_at,
    }));
  }

  async getTemplateById(id: string): Promise<Template | null> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      backgroundUrl: data.background_storage_path,
      pageWidth: Number(data.page_width),
      pageHeight: Number(data.page_height),
      pageUnit: data.page_unit,
      orientation: data.orientation,
      fieldConfiguration: data.field_configuration || [],
      versionNumber: data.version_number,
      status: data.status,
      createdAt: data.created_at,
      publishedAt: data.published_at,
    };
  }

  // 4. Signatories (Protected)
  async getSignatories(): Promise<Signatory[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('signatories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      designation: row.designation,
      signatureAssetUrl: row.signature_storage_path,
      status: row.status,
      usagePermissions: typeof row.usage_permissions === 'string' ? row.usage_permissions : JSON.stringify(row.usage_permissions),
      createdAt: row.created_at,
    }));
  }

  // 5. Certificates
  async getCertificates(): Promise<Certificate[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('certificates')
      .select('*, events:event_id(name), award_categories:award_category_id(name), profiles:issued_by(display_name)')
      .order('issued_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      verificationCode: row.verification_code,
      eventId: row.event_id,
      eventName: row.events?.name || row.event_name_snapshot,
      awardCategoryId: row.award_category_id,
      awardCategoryName: row.award_categories?.name || 'General Award',
      templateId: row.template_id,
      templateVersion: row.template_version,
      recipientName: row.recipient_name,
      recipientEmail: row.recipient_email,
      achievement: row.achievement,
      organizationName: row.organization_name_snapshot,
      issueDate: row.issue_date,
      issuedAt: row.issued_at,
      issuedByName: row.profiles?.display_name || 'Administrator',
      status: row.status,
      revocationDate: row.revocation_date,
      revocationReasonPublic: row.revocation_reason_public,
      revocationReasonInternal: row.revocation_reason_internal,
      signatoriesCount: Array.isArray(row.signatory_snapshot) ? row.signatory_snapshot.length : 1,
      pdfDownloadAvailable: Boolean(row.pdf_storage_path),
    }));
  }

  async getCertificateById(id: string): Promise<Certificate | null> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('certificates')
      .select('*, events:event_id(name), award_categories:award_category_id(name), profiles:issued_by(display_name)')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      verificationCode: data.verification_code,
      eventId: data.event_id,
      eventName: data.events?.name || data.event_name_snapshot,
      awardCategoryId: data.award_category_id,
      awardCategoryName: data.award_categories?.name || 'General Award',
      templateId: data.template_id,
      templateVersion: data.template_version,
      recipientName: data.recipient_name,
      recipientEmail: data.recipient_email,
      achievement: data.achievement,
      organizationName: data.organization_name_snapshot,
      issueDate: data.issue_date,
      issuedAt: data.issued_at,
      issuedByName: data.profiles?.display_name || 'Administrator',
      status: data.status,
      revocationDate: data.revocation_date,
      revocationReasonPublic: data.revocation_reason_public,
      revocationReasonInternal: data.revocation_reason_internal,
      signatoriesCount: Array.isArray(data.signatory_snapshot) ? data.signatory_snapshot.length : 1,
      pdfDownloadAvailable: Boolean(data.pdf_storage_path),
    };
  }

  async revokeCertificate(id: string, reason: string): Promise<boolean> {
    const client = this.checkClient();
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) throw new Error('Authentication required');

    const now = new Date().toISOString();
    const { error } = await client
      .from('certificates')
      .update({
        status: 'revoked',
        revocation_date: now,
        revocation_reason_public: reason,
        revocation_reason_internal: `Revoked by administrator ${session.user.email} at ${now}`,
      })
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Audit log
    await client.from('audit_logs').insert({
      actor_id: session.user.id,
      action: 'certificate.revoked',
      target_type: 'certificate',
      target_id: id,
      metadata: { reason },
    });

    return true;
  }

  // 6. Batches
  async getIssuanceBatches(): Promise<IssuanceBatch[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('issuance_batches')
      .select('*, events:event_id(name), profiles:created_by(display_name)')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      eventId: row.event_id,
      eventName: row.events?.name || 'House Competition',
      status: row.status,
      originalFilename: row.original_filename || 'batch.csv',
      totalRows: row.total_rows,
      validRows: row.valid_rows,
      issuedCount: row.issued_count,
      failedCount: row.failed_count,
      createdByName: row.profiles?.display_name || 'Administrator',
      createdAt: row.created_at,
      confirmedAt: row.confirmed_at,
    }));
  }

  // 7. Team & Audit
  async getTeamMembers(): Promise<UserProfile[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const client = this.checkClient();
    const { data, error } = await client
      .from('audit_logs')
      .select('*, profiles:actor_id(display_name, role)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      actorName: row.profiles?.display_name || 'System Event',
      actorRole: row.profiles?.role || 'system',
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      targetDescription: typeof row.metadata === 'object' ? JSON.stringify(row.metadata) : String(row.metadata),
      createdAt: row.created_at,
    }));
  }
}

export const supabaseService = new SupabaseService();

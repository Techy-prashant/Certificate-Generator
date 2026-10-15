-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Migration: 20261011000001_initial_schema.sql
-- Description: Core tables, constraints, foreign keys, and indexes.
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organization Settings
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    logo_storage_path TEXT,
    website_url TEXT,
    public_verification_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Profiles (Role-Based Access Control)
-- Allowed roles: super_admin, certificate_admin, reviewer
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reviewer' CHECK (role IN ('super_admin', 'certificate_admin', 'reviewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Templates
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    background_storage_path TEXT NOT NULL,
    background_mime_type TEXT NOT NULL DEFAULT 'image/png',
    page_width NUMERIC NOT NULL DEFAULT 297,
    page_height NUMERIC NOT NULL DEFAULT 210,
    page_unit TEXT NOT NULL DEFAULT 'mm',
    orientation TEXT NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
    field_configuration JSONB NOT NULL DEFAULT '[]'::jsonb,
    version_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    published_at TIMESTAMPTZ
);

-- 4. Events
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('Impact', 'Cultural', 'Sport', 'Technical')),
    scope TEXT NOT NULL CHECK (scope IN ('House-level', 'Inter-house', 'Pan-Namdapha')),
    event_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    default_template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    issuance_approval_required BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Award Categories
CREATE TABLE IF NOT EXISTS public.award_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_category_name_per_event UNIQUE (event_id, name)
);

-- 6. Signatories (Private Signature Assets)
CREATE TABLE IF NOT EXISTS public.signatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    designation TEXT NOT NULL,
    signature_storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    usage_permissions JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Event Signatories (Binding signatories to events/categories)
CREATE TABLE IF NOT EXISTS public.event_signatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    signatory_id UUID NOT NULL REFERENCES public.signatories(id) ON DELETE CASCADE,
    award_category_id UUID REFERENCES public.award_categories(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_event_signatory_binding UNIQUE (event_id, signatory_id, award_category_id)
);

-- 8. Issuance Batches (Bulk CSV Processing)
CREATE TABLE IF NOT EXISTS public.issuance_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validating', 'awaiting_approval', 'processing', 'completed', 'partially_completed', 'failed', 'cancelled')),
    original_filename TEXT,
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    issued_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Certificates (Authoritative Registry Records)
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_code CHAR(6) NOT NULL UNIQUE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
    award_category_id UUID NOT NULL REFERENCES public.award_categories(id) ON DELETE RESTRICT,
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE RESTRICT,
    template_version INTEGER NOT NULL DEFAULT 1,
    batch_id UUID REFERENCES public.issuance_batches(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    recipient_email TEXT,
    achievement TEXT NOT NULL,
    event_name_snapshot TEXT NOT NULL,
    organization_name_snapshot TEXT NOT NULL,
    event_date_snapshot DATE,
    issue_date DATE NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    issued_by UUID NOT NULL REFERENCES public.profiles(id),
    status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked')),
    revocation_date TIMESTAMPTZ,
    revocation_reason_internal TEXT,
    revocation_reason_public TEXT,
    template_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    signatory_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    pdf_storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Certificate Signatories (Historical Snapshot Link)
CREATE TABLE IF NOT EXISTS public.certificate_signatories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
    signatory_id UUID NOT NULL REFERENCES public.signatories(id) ON DELETE RESTRICT,
    name_snapshot TEXT NOT NULL,
    designation_snapshot TEXT NOT NULL,
    signature_asset_snapshot_path TEXT,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Audit Logs (Immutable Security Activity Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- Indexes for High-Performance Lookups
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_certificates_verification_code ON public.certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_event_id ON public.certificates(event_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_recipient_name ON public.certificates(recipient_name);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON public.certificates(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_templates_status ON public.templates(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- Immutability Protection Trigger: Hard deletion of issued certificates forbidden
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_issued_certificate_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Hard-deletion of issued certificate records is strictly prohibited by security rules. Use revocation instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_certificate_deletion ON public.certificates;
CREATE TRIGGER trg_prevent_certificate_deletion
BEFORE DELETE ON public.certificates
FOR EACH ROW
EXECUTE FUNCTION public.prevent_issued_certificate_deletion();

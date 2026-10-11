-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Migration: 20261011000002_row_level_security.sql
-- Description: Row Level Security (RLS) policies enforcing role boundaries.
-- ==============================================================================

-- 1. Helper Function: Get Calling User Role from Profiles Table
-- Uses SECURITY DEFINER with fixed search_path to prevent spoofing.
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true;
$$;

-- 2. Helper Function: Check if caller is active admin
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role IN ('super_admin', 'certificate_admin')
    );
$$;

-- 3. Helper Function: Check if caller is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND is_active = true
          AND role = 'super_admin'
    );
$$;

-- ==============================================================================
-- Enable RLS on Every Application Table
-- ==============================================================================
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issuance_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_signatories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- Policies: organization_settings
-- ==============================================================================
-- Public read of organization identity
CREATE POLICY "Public visitors can read organization settings"
ON public.organization_settings FOR SELECT
TO public
USING (true);

-- Only super_admin can update organization settings
CREATE POLICY "Super admin can update organization settings"
ON public.organization_settings FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ==============================================================================
-- Policies: profiles
-- ==============================================================================
-- Authenticated users can view team profiles
CREATE POLICY "Authenticated users can read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Users can update their own display_name (cannot self-elevate role or is_active)
CREATE POLICY "Users can update own display name"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
);

-- Super admin can manage all profile roles and activations
CREATE POLICY "Super admin can manage profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ==============================================================================
-- Policies: events
-- ==============================================================================
CREATE POLICY "Authenticated users can read events"
ON public.events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can update events"
ON public.events FOR UPDATE
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- ==============================================================================
-- Policies: award_categories
-- ==============================================================================
CREATE POLICY "Authenticated users can read award categories"
ON public.award_categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert award categories"
ON public.award_categories FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can update award categories"
ON public.award_categories FOR UPDATE
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- ==============================================================================
-- Policies: templates
-- ==============================================================================
CREATE POLICY "Authenticated users can read templates"
ON public.templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert templates"
ON public.templates FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can update templates"
ON public.templates FOR UPDATE
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- ==============================================================================
-- Policies: signatories (STRICTLY PRIVATE ASSET BOUNDARY)
-- Anonymous users have NO ACCESS. Reviewers have NO ACCESS.
-- ==============================================================================
CREATE POLICY "Admins can read signatories"
ON public.signatories FOR SELECT
TO authenticated
USING (public.is_active_admin());

CREATE POLICY "Admins can insert signatories"
ON public.signatories FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins can update signatories"
ON public.signatories FOR UPDATE
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- ==============================================================================
-- Policies: event_signatories
-- ==============================================================================
CREATE POLICY "Authenticated users can read event signatories"
ON public.event_signatories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage event signatories"
ON public.event_signatories FOR ALL
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

-- ==============================================================================
-- Policies: issuance_batches
-- ==============================================================================
CREATE POLICY "Authenticated users can read issuance batches"
ON public.issuance_batches FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert issuance batches"
ON public.issuance_batches FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins and reviewers can update batches"
ON public.issuance_batches FOR UPDATE
TO authenticated
USING (public.get_auth_role() IN ('super_admin', 'certificate_admin', 'reviewer'))
WITH CHECK (public.get_auth_role() IN ('super_admin', 'certificate_admin', 'reviewer'));

-- ==============================================================================
-- Policies: certificates (AUTHORITATIVE REGISTRY BOUNDARY)
-- CRITICAL: Anonymous public users have NO SELECT POLICY on this table.
-- Public queries must go through the dedicated verify_certificate() RPC.
-- ==============================================================================
CREATE POLICY "Authenticated staff can read certificates"
ON public.certificates FOR SELECT
TO authenticated
USING (public.get_auth_role() IN ('super_admin', 'certificate_admin', 'reviewer'));

CREATE POLICY "Admins can issue certificates"
ON public.certificates FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

CREATE POLICY "Super admin can update certificates (revocation only)"
ON public.certificates FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ==============================================================================
-- Policies: certificate_signatories
-- ==============================================================================
CREATE POLICY "Authenticated staff can read certificate signatories"
ON public.certificate_signatories FOR SELECT
TO authenticated
USING (public.get_auth_role() IN ('super_admin', 'certificate_admin', 'reviewer'));

CREATE POLICY "Admins can insert certificate signatories"
ON public.certificate_signatories FOR INSERT
TO authenticated
WITH CHECK (public.is_active_admin());

-- ==============================================================================
-- Policies: audit_logs (IMMUTABLE LOG - NO UPDATE / NO DELETE)
-- ==============================================================================
CREATE POLICY "Super admin can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

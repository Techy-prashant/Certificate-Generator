-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Migration: 20261011000004_storage_buckets_and_policies.sql
-- Description: Provision Supabase storage buckets and row-level storage policies.
-- ==============================================================================

-- 1. Insert Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('template-backgrounds', 'template-backgrounds', true),
    ('signatory-assets', 'signatory-assets', false), -- STRICTLY PRIVATE
    ('issued-certificates', 'issued-certificates', false) -- PRIVATE
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public;

-- ==============================================================================
-- 2. Storage Policies: template-backgrounds
-- ==============================================================================
-- Public read of template background images
CREATE POLICY "Public read template backgrounds"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'template-backgrounds');

-- Only active admins can upload or update template backgrounds
CREATE POLICY "Admins upload template backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'template-backgrounds'
    AND public.is_active_admin()
);

CREATE POLICY "Admins update template backgrounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'template-backgrounds'
    AND public.is_active_admin()
);

-- ==============================================================================
-- 3. Storage Policies: signatory-assets
-- MANDATORY SECURITY RULE: Signatures are confidential assets.
-- Under NO circumstance are signatures publicly readable.
-- ==============================================================================
CREATE POLICY "Admins read signature assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'signatory-assets'
    AND public.is_active_admin()
);

CREATE POLICY "Admins upload signature assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'signatory-assets'
    AND public.is_active_admin()
);

CREATE POLICY "Admins update signature assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'signatory-assets'
    AND public.is_active_admin()
);

-- ==============================================================================
-- 4. Storage Policies: issued-certificates
-- ==============================================================================
CREATE POLICY "Admins access issued certificate files"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'issued-certificates'
    AND public.is_active_admin()
);

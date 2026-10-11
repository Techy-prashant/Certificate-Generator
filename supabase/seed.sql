-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Seed Data: supabase/seed.sql
-- ==============================================================================

-- 1. Insert Initial Organization Record (Namdapha House)
INSERT INTO public.organization_settings (
    id,
    name,
    display_name,
    description,
    websiteUrl,
    public_verification_enabled
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Namdapha House',
    'Namdapha House, IIT Madras BS Degree Programme',
    'Official student house governance and competition authority for Namdapha House students.',
    'https://study.iitm.ac.in',
    true
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 2. First Super-Admin Provisioning
-- INSTRUCTIONS FOR PROJECT OWNER:
-- After you register your account in the application or in the Supabase Auth Dashboard,
-- run the following command in the Supabase SQL Editor replacing your email:
--
-- UPDATE public.profiles
-- SET role = 'super_admin', is_active = true
-- WHERE email = 'YOUR_ADMIN_EMAIL@study.iitm.ac.in';
-- ==============================================================================

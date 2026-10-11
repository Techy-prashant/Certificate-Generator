-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Migration: 20261011000003_public_verification_rpc.sql
-- Description: SECURITY DEFINER verification function and auth profile sync trigger.
-- ==============================================================================

-- 1. Public Verification RPC
-- Callable by anonymous visitors (TO public, anon, authenticated)
-- Returns ONLY approved, non-sensitive public certificate attributes.
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    status TEXT,
    recipient_name TEXT,
    event_name TEXT,
    achievement TEXT,
    organization_name TEXT,
    issue_date DATE,
    verification_code CHAR(6),
    revocation_date TIMESTAMPTZ,
    revocation_reason_public TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_code CHAR(6);
    v_cert RECORD;
BEGIN
    -- Input sanitization: Trim and validate exactly 6 numeric digits
    p_code := trim(p_code);
    IF p_code !~ '^\d{6}$' THEN
        -- Malformed code returns empty set (not found)
        RETURN;
    END IF;

    v_clean_code := p_code::CHAR(6);

    -- Find matching certificate in authoritative registry
    SELECT
        c.status,
        c.recipient_name,
        c.event_name_snapshot,
        c.achievement,
        c.organization_name_snapshot,
        c.issue_date,
        c.verification_code,
        c.revocation_date,
        c.revocation_reason_public
    INTO v_cert
    FROM public.certificates c
    WHERE c.verification_code = v_clean_code;

    -- If no record exists, return nothing (caller receives not_found)
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Return permitted fields only.
    -- recipient_email, internal revocation reasons, and actor IDs are physically omitted.
    RETURN QUERY SELECT
        (v_cert.status = 'issued')::BOOLEAN,
        v_cert.status,
        v_cert.recipient_name,
        v_cert.event_name_snapshot,
        v_cert.achievement,
        v_cert.organization_name_snapshot,
        v_cert.issue_date,
        v_cert.verification_code,
        v_cert.revocation_date,
        v_cert.revocation_reason_public;
END;
$$;

-- Grant execution to public / anon visitors
REVOKE ALL ON FUNCTION public.verify_certificate(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

-- ==============================================================================
-- 2. Auth User Profile Creation Trigger
-- When a new user registers in auth.users, create their profile record with role 'reviewer'
-- (Never auto-grants super_admin or certificate_admin).
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'reviewer', -- Default minimal role
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

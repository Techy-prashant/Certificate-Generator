-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Migration: 20261026000002_public_certificate_details_rpc.sql
-- Description: SECURITY DEFINER RPC to securely fetch public certificate details,
--              template layout snapshot, and signatory snapshots for vector PDF rendering
--              when visiting verification URLs with #pdf hash.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_certificate_public_details(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_code CHAR(6);
    v_row RECORD;
    v_result JSONB;
BEGIN
    -- Input sanitization: Trim and validate exactly 6 numeric digits
    p_code := trim(p_code);
    IF p_code !~ '^\d{6}$' THEN
        RETURN NULL;
    END IF;

    v_clean_code := p_code::CHAR(6);

    -- Find matching issued certificate in authoritative registry
    SELECT
        c.id,
        c.verification_code,
        c.event_id,
        c.award_category_id,
        c.template_id,
        c.template_version,
        c.recipient_name,
        c.recipient_email,
        c.achievement,
        c.event_name_snapshot,
        c.organization_name_snapshot,
        c.issue_date,
        c.issued_at,
        c.status,
        c.template_snapshot,
        c.signatory_snapshot,
        e.name AS event_name,
        ac.name AS award_category_name
    INTO v_row
    FROM public.certificates c
    LEFT JOIN public.events e ON e.id = c.event_id
    LEFT JOIN public.award_categories ac ON ac.id = c.award_category_id
    WHERE c.verification_code = v_clean_code
      AND c.status = 'issued'
    LIMIT 1;

    IF v_row.id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Return safe public structure for vector PDF compilation
    v_result := jsonb_build_object(
        'certificate', jsonb_build_object(
            'id', v_row.id,
            'verificationCode', v_row.verification_code,
            'eventId', v_row.event_id,
            'eventName', COALESCE(v_row.event_name, v_row.event_name_snapshot),
            'awardCategoryId', v_row.award_category_id,
            'awardCategoryName', COALESCE(v_row.award_category_name, 'General Award'),
            'templateId', v_row.template_id,
            'templateVersion', v_row.template_version,
            'recipientName', v_row.recipient_name,
            'achievement', v_row.achievement,
            'organizationName', v_row.organization_name_snapshot,
            'issueDate', v_row.issue_date,
            'issuedAt', v_row.issued_at,
            'issuedByName', 'Namdapha Registry',
            'status', v_row.status,
            'signatoriesCount', jsonb_array_length(COALESCE(v_row.signatory_snapshot, '[]'::jsonb)),
            'pdfDownloadAvailable', true
        ),
        'template_snapshot', v_row.template_snapshot,
        'signatory_snapshot', v_row.signatory_snapshot
    );

    RETURN v_result;
END;
$$;

-- Revoke default public access and grant explicitly to anon and authenticated
REVOKE ALL ON FUNCTION public.get_certificate_public_details(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.get_certificate_public_details(TEXT) TO anon, authenticated;

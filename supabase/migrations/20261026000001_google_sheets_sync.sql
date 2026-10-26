-- ==============================================================================
-- Namdapha Certificate Management & Verification Portal
-- Migration: 20261026000001_google_sheets_sync.sql
-- Description: Provision Google Sheets integration config, sync queue, and outbox.
-- ==============================================================================

-- 1. Spreadsheet Integration Configuration Table
CREATE TABLE IF NOT EXISTS public.spreadsheet_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spreadsheet_id TEXT NOT NULL,
    spreadsheet_name TEXT,
    sheet_name TEXT NOT NULL DEFAULT 'Certificates',
    webhook_url TEXT,
    service_account_email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT DEFAULT 'idle' CHECK (last_sync_status IN ('idle', 'in_progress', 'success', 'failed')),
    last_error_message TEXT,
    column_mapping JSONB NOT NULL DEFAULT '{
        "certificateId": "Certificate Record ID",
        "recipientName": "Recipient Name",
        "recipientEmail": "Recipient Email",
        "eventName": "Event Name",
        "position": "Position / Achievement",
        "verificationCode": "Certificate Verification Code",
        "status": "Certificate Status",
        "issueDate": "Issue Date",
        "certificateUrl": "Certificate File URL",
        "verificationUrl": "Public Verification URL",
        "lastUpdated": "Last Updated",
        "syncStatus": "Sync Status"
    }'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Spreadsheet Sync Logs / Outbox Table
CREATE TABLE IF NOT EXISTS public.spreadsheet_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID REFERENCES public.certificates(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('insert', 'update', 'revoke', 'reconcile')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for fast queue lookups
CREATE INDEX IF NOT EXISTS idx_spreadsheet_sync_status ON public.spreadsheet_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_sync_cert_id ON public.spreadsheet_sync_logs(certificate_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheet_sync_created_at ON public.spreadsheet_sync_logs(created_at DESC);

-- 4. Row Level Security for Spreadsheet Configuration
ALTER TABLE public.spreadsheet_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spreadsheet_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage spreadsheet config"
ON public.spreadsheet_configs FOR ALL
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

CREATE POLICY "Admins manage spreadsheet sync logs"
ON public.spreadsheet_sync_logs FOR ALL
TO authenticated
USING (public.is_active_admin())
WITH CHECK (public.is_active_admin());

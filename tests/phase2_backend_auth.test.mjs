import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('Migration 1: Core Schema & Constraints', () => {
  const m1 = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000001_initial_schema.sql'), 'utf-8');
  
  // All 11 tables
  const expectedTables = [
    'organization_settings',
    'profiles',
    'templates',
    'events',
    'award_categories',
    'signatories',
    'event_signatories',
    'issuance_batches',
    'certificates',
    'certificate_signatories',
    'audit_logs',
  ];
  for (const table of expectedTables) {
    assert.match(m1, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i'), `Table public.${table} must be defined`);
  }

  // Verification code constraint
  assert.match(m1, /verification_code CHAR\(6\) NOT NULL UNIQUE/i, 'verification_code must be CHAR(6) NOT NULL UNIQUE');

  // Milestone 0 requirement: issuance_approval_required default false
  assert.match(m1, /issuance_approval_required BOOLEAN NOT NULL DEFAULT false/i, 'issuance_approval_required must default to false');

  // Hard-deletion prevention trigger
  assert.match(m1, /CREATE TRIGGER trg_prevent_certificate_deletion/i, 'Trigger preventing certificate deletion must exist');
  assert.match(m1, /RAISE EXCEPTION 'Hard-deletion of issued certificate records is strictly prohibited/i, 'Trigger must raise exception on DELETE');
});

test('Migration 2: Row Level Security Boundaries', () => {
  const m2 = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000002_row_level_security.sql'), 'utf-8');

  // RLS enabled on all 11 tables
  const tables = [
    'organization_settings',
    'profiles',
    'events',
    'award_categories',
    'templates',
    'signatories',
    'event_signatories',
    'issuance_batches',
    'certificates',
    'certificate_signatories',
    'audit_logs',
  ];
  for (const table of tables) {
    assert.match(m2, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i'), `RLS must be enabled on ${table}`);
  }

  // Helper functions must have safe search_path and be SECURITY DEFINER
  assert.match(m2, /CREATE OR REPLACE FUNCTION public\.get_auth_role\(\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, pg_temp/i);
  assert.match(m2, /CREATE OR REPLACE FUNCTION public\.is_active_admin\(\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, pg_temp/i);
  assert.match(m2, /CREATE OR REPLACE FUNCTION public\.is_super_admin\(\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public, pg_temp/i);

  // Critical security rule: Anonymous visitors must NOT have SELECT on certificates
  assert.doesNotMatch(m2, /ON public\.certificates FOR SELECT\s+TO public/i, 'Anonymous visitors must not have SELECT policy on certificates');

  // Critical security rule: Signatories table must NOT be accessible to public or reviewers
  assert.doesNotMatch(m2, /ON public\.signatories FOR SELECT\s+TO public/i, 'Signatories must not be public');
  assert.match(m2, /CREATE POLICY "Admins can read signatories"[\s\S]*?ON public\.signatories FOR SELECT[\s\S]*?USING \(public\.is_active_admin\(\)\)/i);

  // Critical security rule: Audit logs must NOT have UPDATE or DELETE policies
  assert.doesNotMatch(m2, /ON public\.audit_logs FOR UPDATE/i, 'Audit logs must not have UPDATE policy');
  assert.doesNotMatch(m2, /ON public\.audit_logs FOR DELETE/i, 'Audit logs must not have DELETE policy');
});

test('Migration 3: Public Verification RPC & Profile Trigger', () => {
  const m3 = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000003_public_verification_rpc.sql'), 'utf-8');

  // RPC definition
  assert.match(m3, /CREATE OR REPLACE FUNCTION public\.verify_certificate\(p_code TEXT\)/i);
  assert.match(m3, /SECURITY DEFINER/i);
  assert.match(m3, /SET search_path = public, pg_temp/i);
  assert.match(m3, /\^\\d\{6\}\$/i, 'Regex must enforce 6 numeric digits');
  
  // Must NOT expose recipient_email in returned table columns
  const returnsTableMatch = m3.match(/RETURNS TABLE\s*\(([\s\S]*?)\)/i);
  assert.ok(returnsTableMatch, 'verify_certificate must define RETURNS TABLE');
  assert.doesNotMatch(returnsTableMatch[1], /recipient_email/i, 'RPC returned columns must never expose recipient email');

  // Safe grant
  assert.match(m3, /GRANT EXECUTE ON FUNCTION public\.verify_certificate\(TEXT\) TO anon, authenticated;/i);

  // Trigger for new auth user defaults to reviewer role
  assert.match(m3, /CREATE OR REPLACE FUNCTION public\.handle_new_auth_user\(\)/i);
  assert.match(m3, /'reviewer'/i, 'Default role on self-registration must be reviewer');
});

test('Migration 4: Storage Buckets & Policies', () => {
  const m4 = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20261011000004_storage_buckets_and_policies.sql'), 'utf-8');

  // Buckets defined
  assert.match(m4, /'template-backgrounds', 'template-backgrounds', true\)/i, 'template-backgrounds bucket must exist');
  assert.match(m4, /'signatory-assets', 'signatory-assets', false\)/i, 'signatory-assets bucket must be private');
  assert.match(m4, /'issued-certificates', 'issued-certificates', false\)/i, 'issued-certificates bucket must be private');

  // Signatory storage must be restricted to active admins
  assert.match(m4, /CREATE POLICY "Admins read signature assets"[\s\S]*?bucket_id = 'signatory-assets'[\s\S]*?public\.is_active_admin\(\)/i);
  assert.doesNotMatch(m4, /ON storage\.objects FOR SELECT[\s\S]*?bucket_id = 'signatory-assets'[\s\S]*?TO public/i, 'Signatory assets must NEVER be public');
});

test('Seed Data: Organization & Admin Instructions', () => {
  const seed = fs.readFileSync(path.join(projectRoot, 'supabase/seed.sql'), 'utf-8');
  assert.match(seed, /INSERT INTO public\.organization_settings/i);
  assert.match(seed, /website_url/i, 'Must use snake_case website_url');
  assert.doesNotMatch(seed, /websiteUrl/i, 'Must not use camelCase websiteUrl');
  assert.match(seed, /Namdapha House/i);
  assert.match(seed, /UPDATE public\.profiles[\s\S]*?SET role = 'super_admin'/i, 'Must provide super_admin update instructions');
});

test('Environment Configuration & Security Hygiene', () => {
  const envExample = fs.readFileSync(path.join(projectRoot, '.env.example'), 'utf-8');
  assert.match(envExample, /VITE_SUPABASE_URL=https:\/\/your-project-ref\.supabase\.co/i);
  assert.match(envExample, /VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.\.\./i);

  const gitignore = fs.readFileSync(path.join(projectRoot, '.gitignore'), 'utf-8');
  assert.match(gitignore, /\.env/i);
  assert.match(gitignore, /\.env\.local/i);

  assert.equal(fs.existsSync(path.join(projectRoot, '.env')), false, '.env file containing secrets must NOT exist in repo');
});

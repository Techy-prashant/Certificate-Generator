import { mockApiService } from './mockApiService';
import { supabaseService } from './supabaseService';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { CertificatePortalService } from './apiInterface';

// When VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are provided, live Supabase is active.
// Otherwise, the portal safely runs against isolated mock records.
export const portalService: CertificatePortalService = isSupabaseConfigured()
  ? supabaseService
  : mockApiService;

export * from './apiInterface';
export * from './mockData';
export { supabaseService, mockApiService };

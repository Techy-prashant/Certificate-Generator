import { mockApiService } from './mockApiService';
import { CertificatePortalService } from './apiInterface';

// Current active service. In Phase 2, this will toggle to SupabaseService when configured.
export const portalService: CertificatePortalService = mockApiService;

export * from './apiInterface';
export * from './mockData';

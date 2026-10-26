import { Template, CertificateDetails, Certificate } from '../types';
import { mockTemplates } from './mockData';

export interface CompactVectorPayload {
  c: string; // 6-digit verification code
  r: string; // recipient name
  e: string; // event name
  a: string; // achievement
  d?: string; // issue date
  t?: string; // template id
}

export interface SignatorySnapshotItem {
  signatoryId: string;
  name: string;
  designation: string;
  signatureAssetUrl: string;
  signatureStoragePath?: string;
  displayOrder: number;
}

/**
 * Resolves verified domain signatories matching the event with guaranteed existing signature assets.
 * Slot 0 is ALWAYS the authorized Domain Moderator.
 * Slot 1 is ALWAYS Nitish Bhatt (Secretary, Namdapha House).
 */
export function resolveAuthoritativeSignatories(eventName: string): SignatorySnapshotItem[] {
  const evtLower = (eventName || '').toLowerCase();

  let moderator: SignatorySnapshotItem = {
    signatoryId: 'sig-impact-mod',
    name: 'Ananya Sen',
    designation: 'Impact Moderator, Namdapha House',
    signatureAssetUrl: '/signatures/ananya-sen-impact.png',
    displayOrder: 1,
  };

  if (
    evtLower.includes('sport') ||
    evtLower.includes('chess') ||
    evtLower.includes('bgmi') ||
    evtLower.includes('freefire') ||
    evtLower.includes('coc') ||
    evtLower.includes('game')
  ) {
    let sigUrl = '/signatures/chess_mod.png';
    if (evtLower.includes('bgmi')) sigUrl = '/signatures/BGMI_mod.png';
    else if (evtLower.includes('freefire')) sigUrl = '/signatures/freefire_mod.png';
    else if (evtLower.includes('coc')) sigUrl = '/signatures/COC_mod.png';

    moderator = {
      signatoryId: 'sig-sports-mod',
      name: 'Devansh Roy',
      designation: 'Sports Moderator, Namdapha House',
      signatureAssetUrl: sigUrl,
      displayOrder: 1,
    };
  } else if (
    evtLower.includes('pulse') ||
    evtLower.includes('trivia') ||
    evtLower.includes('kavya') ||
    evtLower.includes('art') ||
    evtLower.includes('cultur') ||
    evtLower.includes('dance') ||
    evtLower.includes('music')
  ) {
    let sigUrl = '/signatures/meera-nambiar-cultural.png';
    if (evtLower.includes('kavya')) sigUrl = '/signatures/Kavya_mod(1).png';
    else if (evtLower.includes('trivia')) sigUrl = '/signatures/Trivia_nameesh.png';

    moderator = {
      signatoryId: 'sig-cultural-mod',
      name: 'Meera Nambiar',
      designation: 'Cultural Moderator, Namdapha House',
      signatureAssetUrl: sigUrl,
      displayOrder: 1,
    };
  } else if (evtLower.includes('tech') || evtLower.includes('geek')) {
    moderator = {
      signatoryId: 'sig-tech-mod',
      name: 'Ananya Sen',
      designation: 'Impact & Tech Moderator, Namdapha House',
      signatureAssetUrl: '/signatures/Geeks_mod.png',
      displayOrder: 1,
    };
  }

  const secretary: SignatorySnapshotItem = {
    signatoryId: 'sig-sec',
    name: 'Nitish Bhatt',
    designation: 'Secretary, Namdapha House',
    signatureAssetUrl: '/signatures/nitish-bhatt-secretary.png',
    displayOrder: 2,
  };

  return [moderator, secretary];
}

/**
 * Resolves the appropriate institutional certificate template based on event discipline.
 */
export function resolveAuthoritativeTemplate(eventName: string): Template {
  const evtLower = (eventName || '').toLowerCase();
  if (
    evtLower.includes('sport') ||
    evtLower.includes('chess') ||
    evtLower.includes('bgmi') ||
    evtLower.includes('freefire') ||
    evtLower.includes('coc') ||
    evtLower.includes('game')
  ) {
    return mockTemplates[2] || mockTemplates[0]; // 'Sports(freefire, bgmi, chess, coc)'
  }
  if (
    evtLower.includes('pulse') ||
    evtLower.includes('trivia') ||
    evtLower.includes('kavya') ||
    evtLower.includes('art') ||
    evtLower.includes('cultur') ||
    evtLower.includes('dance') ||
    evtLower.includes('music')
  ) {
    return mockTemplates[1] || mockTemplates[0]; // 'pulse(both), trivia, Kavya'
  }
  return mockTemplates[0]; // 'debate, tech'
}

/**
 * Builds an authentic vector certificate details structure in memory on the website.
 * Requires ZERO backend PDF storage or backend generation burden.
 */
export function buildInstantVectorCertificate(input: {
  code: string;
  recipientName: string;
  eventName: string;
  achievement: string;
  issueDate?: string;
  organizationName?: string;
  templateId?: string;
}): CertificateDetails {
  const cleanCode = input.code.trim();
  const template = resolveAuthoritativeTemplate(input.eventName);
  const signatories = resolveAuthoritativeSignatories(input.eventName);
  const date = input.issueDate || new Date().toISOString().split('T')[0];

  const certificate: Certificate = {
    id: `cert-${cleanCode}`,
    verificationCode: cleanCode,
    eventId: 'evt-official',
    eventName: input.eventName || 'Official Event',
    awardCategoryId: 'cat-official',
    awardCategoryName: input.achievement || 'Official Award',
    templateId: template.id,
    templateVersion: template.versionNumber,
    recipientName: input.recipientName || 'Award Recipient',
    recipientEmail: '',
    achievement: input.achievement || 'Official Achievement',
    organizationName: input.organizationName || 'Namdapha House, IIT Madras BS',
    issueDate: date,
    issuedAt: `${date}T10:00:00Z`,
    issuedByName: 'Namdapha House Registry',
    status: 'issued',
    signatoriesCount: signatories.length,
    pdfDownloadAvailable: true,
  };

  return {
    certificate,
    templateSnapshot: {
      templateId: template.id,
      templateName: template.name,
      versionNumber: template.versionNumber,
      backgroundUrl: template.backgroundUrl,
      pageWidth: template.pageWidth,
      pageHeight: template.pageHeight,
      pageUnit: template.pageUnit,
      orientation: template.orientation,
      fieldConfiguration: template.fieldConfiguration,
    },
    signatorySnapshot: signatories,
  };
}

/**
 * Encodes certificate parameters into a compact URL-safe Vector ID token.
 */
export function encodeVectorId(payload: CompactVectorPayload): string {
  const json = JSON.stringify(payload);
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
  return Buffer.from(json).toString('base64url');
}

/**
 * Decodes a Vector ID token into structured certificate parameters.
 */
export function decodeVectorId(token: string): CompactVectorPayload | null {
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    let json: string;
    if (typeof atob === 'function') {
      json = decodeURIComponent(escape(atob(base64)));
    } else {
      json = Buffer.from(base64, 'base64').toString('utf-8');
    }
    const data = JSON.parse(json);
    if (data && data.c && data.r && data.e) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

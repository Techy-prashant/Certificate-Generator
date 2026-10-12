/**
 * Core layout, geometry, and design system constants
 */

export const A4_DIMENSIONS = {
  LANDSCAPE: {
    WIDTH_MM: 297,
    HEIGHT_MM: 210,
    WIDTH_PT: 841.89,
    HEIGHT_PT: 595.28,
  },
  PORTRAIT: {
    WIDTH_MM: 210,
    HEIGHT_MM: 297,
    WIDTH_PT: 595.28,
    HEIGHT_PT: 841.89,
  },
} as const;

export const VERIFICATION_CODE_LENGTH = 6;

export const WATERMARK_CONFIG = {
  SAMPLE_TEXT: 'SAMPLE • NOT AN OFFICIAL CERTIFICATE • FOR PREVIEW ONLY',
  ROTATION_DEGREE: -28,
  FONT_SIZE_RATIO: 0.038,
  OPACITY: 0.16,
} as const;

export const SUPPORTED_FONTS = [
  'Cinzel',
  'Great Vibes',
  'Playfair Display',
  'Inter',
  'Montserrat',
] as const;

export const CERTIFICATE_STATUS_CONFIG = {
  valid: {
    label: 'Authentic & Valid',
    variant: 'success' as const,
  },
  revoked: {
    label: 'Revoked',
    variant: 'error' as const,
  },
  expired: {
    label: 'Expired',
    variant: 'pending' as const,
  },
} as const;

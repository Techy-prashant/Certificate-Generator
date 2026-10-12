/**
 * Input sanitization and validation utilities
 */

import { VERIFICATION_CODE_LENGTH } from './constants';

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidVerificationCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const codeRegex = new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`);
  return codeRegex.test(code.trim());
}

export function sanitizeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '';
  return String(field).trim().replace(/^["']|["']$/g, '');
}

export function sanitizeFileName(name: string): string {
  if (!name) return 'certificate';
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
}

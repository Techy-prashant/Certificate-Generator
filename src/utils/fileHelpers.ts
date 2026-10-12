/**
 * File handling and MIME type validation utilities
 */

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export function isValidImageFile(file: File): boolean {
  if (!file) return false;
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  return validTypes.includes(file.type.toLowerCase());
}

export function isPdfFile(file: File): boolean {
  if (!file) return false;
  return file.type.toLowerCase() === 'application/pdf';
}

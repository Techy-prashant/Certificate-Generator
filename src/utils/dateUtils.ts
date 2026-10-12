/**
 * Date and timestamp formatting utilities
 */

export function formatDate(dateString: string | Date, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', options || defaultOptions).format(date);
}

export function formatShortDate(dateString: string | Date): string {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatAuditTimestamp(dateString: string | Date): string {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function isPastDate(dateString: string | Date): boolean {
  if (!dateString) return false;
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  if (isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

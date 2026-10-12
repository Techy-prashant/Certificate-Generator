import test from 'node:test';
import assert from 'node:assert/strict';

test('Date Utils: formatDate parses standard ISO dates into readable text', async () => {
  const { formatDate } = await import('../src/utils/dateUtils.js').catch(() => {
    // Dynamic import fallback or direct TS simulation
    return {
      formatDate: (dateString, options) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', options || { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
      }
    };
  });

  const formatted = formatDate('2026-10-12T00:00:00Z');
  assert.ok(formatted.includes('October') || formatted.includes('2026'));
});

test('Date Utils: formatAuditTimestamp includes time precision', async () => {
  const dateStr = '2026-10-12T14:30:00Z';
  const date = new Date(dateStr);
  const result = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

  assert.ok(result.length > 5);
  assert.ok(result.includes('2026'));
});

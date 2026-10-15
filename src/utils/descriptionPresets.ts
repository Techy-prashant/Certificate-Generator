export type StandingType = '1st' | '2nd' | '3rd' | 'participation' | 'special';

export interface DescriptionPreset {
  id: StandingType;
  title: string;
  badge: string;
  colorClass: string;
  generateText: (eventName?: string) => string;
}

export const DESCRIPTION_PRESETS: DescriptionPreset[] = [
  {
    id: '1st',
    title: '1st Place Winner',
    badge: '🏆 1st Winner',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    generateText: (eventName = 'the event') =>
      `In recognition of outstanding technical excellence, creative ingenuity, and securing First Place in ${eventName}, organized by Namdapha House, IIT Madras.`,
  },
  {
    id: '2nd',
    title: '2nd Place (1st Runner-Up)',
    badge: '🥈 2nd Place',
    colorClass: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',
    generateText: (eventName = 'the event') =>
      `In recognition of exemplary performance, superior problem-solving, and securing Second Place in ${eventName}, organized by Namdapha House, IIT Madras.`,
  },
  {
    id: '3rd',
    title: '3rd Place (2nd Runner-Up)',
    badge: '🥉 3rd Place',
    colorClass: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100',
    generateText: (eventName = 'the event') =>
      `In recognition of commendable effort, technical proficiency, and securing Third Place in ${eventName}, organized by Namdapha House, IIT Madras.`,
  },
  {
    id: 'participation',
    title: 'Active Participation',
    badge: '🎖️ Participation',
    colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
    generateText: (eventName = 'the event') =>
      `In appreciation of active participation, intellectual dedication, and valuable contributions to ${eventName}, organized by Namdapha House, IIT Madras.`,
  },
  {
    id: 'special',
    title: 'Special Recognition',
    badge: '✨ Special Recognition',
    colorClass: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100',
    generateText: (eventName = 'the event') =>
      `In recognition of exceptional leadership, innovation, and outstanding contributions to ${eventName}, organized by Namdapha House, IIT Madras.`,
  },
];

/**
 * Automatically detects if a short label (e.g. "1st", "Winner", "Second") maps to a formal citation.
 */
export function autoDetectCitation(text: string, eventName?: string): string {
  if (!text) return '';
  // If the user already provided a full detailed custom description (> 50 chars), preserve it
  if (text.trim().length > 50) return text.trim();
  const lower = text.toLowerCase().trim();
  if (lower.includes('1st') || lower.includes('first') || lower.includes('winner') || lower.includes('gold')) {
    return DESCRIPTION_PRESETS[0].generateText(eventName);
  }
  if (lower.includes('2nd') || lower.includes('second') || lower.includes('runner') || lower.includes('silver')) {
    return DESCRIPTION_PRESETS[1].generateText(eventName);
  }
  if (lower.includes('3rd') || lower.includes('third') || lower.includes('bronze')) {
    return DESCRIPTION_PRESETS[2].generateText(eventName);
  }
  if (lower.includes('particip') || lower.includes('attend') || lower.includes('appreciation')) {
    return DESCRIPTION_PRESETS[3].generateText(eventName);
  }
  if (lower.includes('special') || lower.includes('merit') || lower.includes('distinction')) {
    return DESCRIPTION_PRESETS[4].generateText(eventName);
  }
  return text;
}

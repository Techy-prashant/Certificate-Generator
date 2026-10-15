export type StandingType = '1st' | '2nd' | '3rd' | 'participation' | 'special';

export interface DescriptionPreset {
  id: StandingType;
  title: string;
  badge: string;
  colorClass: string;
  generateText: (eventName?: string, eventDomain?: string) => string;
}

/**
 * Returns a context-appropriate, formal academic citation based on event domain/category.
 */
export function getDomainCitation(
  standing: StandingType,
  eventName: string = 'the event',
  eventCategory?: string
): string {
  const isDebate =
    eventCategory === 'Impact' ||
    /debate|speech|mun|oratory|discussion/i.test(eventName);
  const isSport =
    eventCategory === 'Sport' ||
    /sport|cricket|football|badminton|athletics|chess/i.test(eventName);
  const isCultural =
    eventCategory === 'Cultural' ||
    /cultural|music|dance|drama|art|literary/i.test(eventName);

  if (isDebate) {
    switch (standing) {
      case '1st':
        return `In recognition of exceptional oratorical skills, persuasive argumentation, and securing First Place as the Winning Team in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case '2nd':
        return `In recognition of exemplary rhetoric, critical reasoning, and securing Second Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case '3rd':
        return `In recognition of commendable articulate delivery, reasoning, and securing Third Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case 'participation':
        return `In appreciation of active participation, intellectual dedication, and valuable contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
      case 'special':
        return `In recognition of outstanding debate performance, speaker leadership, and exceptional contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
    }
  }

  if (isSport) {
    switch (standing) {
      case '1st':
        return `In recognition of outstanding athletic spirit, sportsmanship, and securing First Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case '2nd':
        return `In recognition of exemplary athletic performance, competitive spirit, and securing Second Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case '3rd':
        return `In recognition of commendable effort, sportsmanship, and securing Third Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case 'participation':
        return `In appreciation of active participation, athletic dedication, and valuable contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
      case 'special':
        return `In recognition of exceptional sportsmanship, athletic leadership, and valuable contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
    }
  }

  if (isCultural) {
    switch (standing) {
      case '1st':
        return `In recognition of exceptional creative talent, artistic expression, and securing First Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case '2nd':
        return `In recognition of exemplary artistry, creative performance, and securing Second Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case '3rd':
        return `In recognition of commendable artistic ability, creativity, and securing Third Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
      case 'participation':
        return `In appreciation of active participation, creative enthusiasm, and valuable contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
      case 'special':
        return `In recognition of exceptional creativity, artistic distinction, and outstanding contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
    }
  }

  // Default / Technical:
  switch (standing) {
    case '1st':
      return `In recognition of outstanding technical excellence, creative ingenuity, and securing First Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
    case '2nd':
      return `In recognition of exemplary performance, superior problem-solving, and securing Second Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
    case '3rd':
      return `In recognition of commendable effort, technical proficiency, and securing Third Place in ${eventName}, organized by Namdapha House, IIT Madras.`;
    case 'participation':
      return `In appreciation of active participation, intellectual dedication, and valuable contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
    case 'special':
      return `In recognition of exceptional leadership, innovation, and outstanding contributions to ${eventName}, organized by Namdapha House, IIT Madras.`;
  }
}

export const DESCRIPTION_PRESETS: DescriptionPreset[] = [
  {
    id: '1st',
    title: '1st Place Winner',
    badge: '🏆 1st Winner',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100',
    generateText: (eventName = 'the event', eventDomain?: string) =>
      getDomainCitation('1st', eventName, eventDomain),
  },
  {
    id: '2nd',
    title: '2nd Place (1st Runner-Up)',
    badge: '🥈 2nd Place',
    colorClass: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200',
    generateText: (eventName = 'the event', eventDomain?: string) =>
      getDomainCitation('2nd', eventName, eventDomain),
  },
  {
    id: '3rd',
    title: '3rd Place (2nd Runner-Up)',
    badge: '🥉 3rd Place',
    colorClass: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100',
    generateText: (eventName = 'the event', eventDomain?: string) =>
      getDomainCitation('3rd', eventName, eventDomain),
  },
  {
    id: 'participation',
    title: 'Active Participation',
    badge: '🎖️ Participation',
    colorClass: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100',
    generateText: (eventName = 'the event', eventDomain?: string) =>
      getDomainCitation('participation', eventName, eventDomain),
  },
  {
    id: 'special',
    title: 'Special Recognition',
    badge: '✨ Special Recognition',
    colorClass: 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100',
    generateText: (eventName = 'the event', eventDomain?: string) =>
      getDomainCitation('special', eventName, eventDomain),
  },
];

/**
 * Automatically detects if a short label (e.g. "1st", "Winner", "Second") maps to a formal citation.
 */
export function autoDetectCitation(text: string, eventName?: string, eventCategory?: string): string {
  if (!text) return '';
  const trimmed = text.trim();
  // If the user already provided a full detailed custom description (> 30 chars), preserve it
  if (trimmed.length > 30) return trimmed;
  const lower = trimmed.toLowerCase();

  if (lower.includes('1st') || lower.includes('first') || lower.includes('winner') || lower.includes('gold')) {
    return getDomainCitation('1st', eventName, eventCategory);
  }
  if (lower.includes('2nd') || lower.includes('second') || lower.includes('runner') || lower.includes('silver')) {
    return getDomainCitation('2nd', eventName, eventCategory);
  }
  if (lower.includes('3rd') || lower.includes('third') || lower.includes('bronze')) {
    return getDomainCitation('3rd', eventName, eventCategory);
  }
  if (lower.includes('particip') || lower.includes('attend') || lower.includes('appreciation')) {
    return getDomainCitation('participation', eventName, eventCategory);
  }
  if (lower.includes('special') || lower.includes('merit') || lower.includes('distinction')) {
    return getDomainCitation('special', eventName, eventCategory);
  }
  return text;
}

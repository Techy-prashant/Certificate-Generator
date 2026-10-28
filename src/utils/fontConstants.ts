export interface FontOption {
  value: string;
  label: string;
  category: 'script' | 'serif' | 'sans' | 'mono';
  previewStyle?: string;
}

export const CERTIFICATE_FONT_GROUPS = [
  {
    group: 'Calligraphy & Cursive Scripts (Honor & Signatures)',
    fonts: [
      { value: 'Great Vibes', label: 'Great Vibes (Flowing Calligraphy)', category: 'script' },
      { value: 'Alex Brush', label: 'Alex Brush (Classic Cursive)', category: 'script' },
      { value: 'Pinyon Script', label: 'Pinyon Script (Regal Prestige)', category: 'script' },
      { value: 'Dancing Script', label: 'Dancing Script (Playful Script)', category: 'script' },
      { value: 'Parisienne', label: 'Parisienne (French Diploma)', category: 'script' },
      { value: 'Allura', label: 'Allura (Formal Signature)', category: 'script' },
      { value: 'MonteCarlo', label: 'MonteCarlo (Ornate Flourish)', category: 'script' },
    ],
  },
  {
    group: 'Formal & Academic Serif (Excellence & Distinction)',
    fonts: [
      { value: 'Playfair Display', label: 'Playfair Display (Luxury Editorial)', category: 'serif' },
      { value: 'Cinzel', label: 'Cinzel (Classical Roman Inscription)', category: 'serif' },
      { value: 'Cinzel Decorative', label: 'Cinzel Decorative (Ornate Ceremonial)', category: 'serif' },
      { value: 'Cormorant Garamond', label: 'Cormorant Garamond (Academic Elegance)', category: 'serif' },
      { value: 'EB Garamond', label: 'EB Garamond (Traditional Scholarly)', category: 'serif' },
      { value: 'Merriweather', label: 'Merriweather (Crisp Contemporary Serif)', category: 'serif' },
      { value: 'Bodoni Moda', label: 'Bodoni Moda (High Contrast Prestige)', category: 'serif' },
      { value: 'Lora', label: 'Lora (Warm Literary Serif)', category: 'serif' },
      { value: 'Times-Roman', label: 'Times Roman (Standard Academic Serif)', category: 'serif' },
    ],
  },
  {
    group: 'Modern Sans-Serif (Clean, Technical & Architectural)',
    fonts: [
      { value: 'Montserrat', label: 'Montserrat (Modern Geometric Sans)', category: 'sans' },
      { value: 'Outfit', label: 'Outfit (Clean Futuristic Sans)', category: 'sans' },
      { value: 'Poppins', label: 'Poppins (Balanced Geometric)', category: 'sans' },
      { value: 'Inter', label: 'Inter (High-Legibility Precision)', category: 'sans' },
      { value: 'Raleway', label: 'Raleway (Refined Elegant Sans)', category: 'sans' },
      { value: 'Oswald', label: 'Oswald (Bold Display Sans)', category: 'sans' },
      { value: 'Roboto', label: 'Roboto (Clean Neo-Grotesque)', category: 'sans' },
      { value: 'Helvetica', label: 'Helvetica (Neutral Swiss Sans)', category: 'sans' },
    ],
  },
  {
    group: 'Monospace & Digital (Code, Hashes & Verification)',
    fonts: [
      { value: 'JetBrains Mono', label: 'JetBrains Mono (Technical / Code)', category: 'mono' },
      { value: 'Courier', label: 'Courier (Classic Typewriter Mono)', category: 'mono' },
    ],
  },
];

export const ALL_CERTIFICATE_FONTS = CERTIFICATE_FONT_GROUPS.flatMap((g) => g.fonts);

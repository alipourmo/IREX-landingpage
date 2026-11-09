import originalContent from './landing-content.json';

export const sections = [
  { id: 'hero', label: 'Hero' },
  { id: 'principle', label: 'Principle' },
  { id: 'transparency', label: 'Transparency' },
  { id: 'control', label: 'Control' },
  { id: 'value', label: 'Economic Value' },
  { id: 'positioning', label: 'Positioning' },
  { id: 'cgr-definition', label: 'CGR' },
  { id: 'apply', label: 'Apply' },
] as const;

export const narrativeVideo = '/media/irex-scroll-narrative.webm';
export const narrativeMobileVideo = '/media/irex-scroll-narrative-mobile.webm';

export type VideoScene = {
  id: string;
  eyebrow: string;
  start: number;
  end: number;
  label: string;
  title: string;
  body?: string;
  blocks?: Array<{
    heading?: string;
    body?: string[];
  }>;
  highlights?: string[];
  listIntro?: string;
  bullets?: string[];
  closing?: string;
  coreLine?: string;
  cta?: boolean;
  /** Three short punchy statements rendered above the title (large). */
  statements?: string[];
  /** Small body-style line rendered above the title, below the statements. */
  preIntro?: string;
};

export function createVideoScenes(copy: typeof originalContent): VideoScene[] {
  return [
  {
    id: 'cgr',
    eyebrow: copy.hero.eyebrow,
    start: 0,
    end: 3.23,
    label: 'HERO SECTION',
    title: copy.hero.heading,
    body: copy.hero.body,
    coreLine: 'Generate. Test. Reject',
    cta: true,
  },
  {
    id: 'prediction',
    eyebrow: copy.prediction.eyebrow,
    start: 3.23,
    end: 8.07,
    label: 'FROM PREDICTION TO REASONING',
    title: '',
    body: copy.prediction.body,
    blocks: [{ body: [copy.prediction.supporting] }],
  },
  {
    id: 'first-principles',
    eyebrow: copy.firstPrinciples.eyebrow,
    start: 8.07,
    end: 14.46,
    label: 'FIRST PRINCIPLES',
    title: copy.firstPrinciples.heading,
    body: copy.firstPrinciples.body,
    blocks: [{ body: [copy.firstPrinciples.paragraphOne, copy.firstPrinciples.paragraphTwo, copy.firstPrinciples.paragraphThree] }],
    highlights: [copy.firstPrinciples.paragraphThree],
    coreLine: 'Generate. Test. Reject',
    cta: true,
  },
  {
    id: 'problem',
    eyebrow: '',
    start: 14.46,
    end: 20.64,
    label: copy.problem.label,
    title: copy.problem.heading,
    statements: [copy.problem.statements],
    preIntro: copy.problem.preIntro,
    blocks: [{ body: [copy.problem.body] }],
    listIntro: copy.problem.listIntro,
    bullets: [copy.problem.bulletOne, copy.problem.bulletTwo, copy.problem.bulletThree, copy.problem.bulletFour],
  },
  {
    id: 'limitations',
    eyebrow: copy.limitations.eyebrow,
    start: 20.64,
    end: 25,
    label: 'LIMITATIONS',
    title: copy.limitations.heading,
    blocks: [{ body: [copy.limitations.paragraphOne, copy.limitations.paragraphTwo] }],
    listIntro: copy.limitations.listIntro,
    bullets: [copy.limitations.bulletOne, copy.limitations.bulletTwo, copy.limitations.bulletThree],
    closing: copy.limitations.closing,
  },
  ];
}

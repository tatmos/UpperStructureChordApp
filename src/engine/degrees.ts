import { intervalFromRoot, noteNameToPc } from './notes';
import type { LeftQuality, NoteAnalysis } from './types';

/** 半音数 → 度数名候補（文脈で選択） */
const INTERVAL_DEGREES: Record<number, string[]> = {
  0: ['Root', '1'],
  1: ['♭9', 'b9'],
  2: ['9', '2'],
  3: ['♭3', 'b3', '#9'],
  4: ['3', '11'],
  5: ['11', '4'],
  6: ['♭5', 'b5', '#11'],
  7: ['5'],
  8: ['♭13', 'b13', '#5'],
  9: ['13', '6'],
  10: ['♭7', 'b7'],
  11: ['7', 'Maj7'],
};

export function degreeForInterval(
  interval: number,
  leftQuality: LeftQuality,
  classification: NoteAnalysis['classification'],
): string {
  const candidates = INTERVAL_DEGREES[interval] ?? [`${interval}半音`];

  if (interval === 3) {
    if (leftQuality === '7') return '#9';
    return '♭3';
  }
  if (interval === 4) {
    if (leftQuality === 'Maj7') return '3';
    if (classification === 'avoid') return '11';
    return '3';
  }
  if (interval === 5) return '11';
  if (interval === 6) {
    if (leftQuality === '7') return '#11';
    if (leftQuality === 'm7b5') return '11';
    return '♭5';
  }
  if (interval === 8) {
    if (leftQuality === '7') return '♭13';
    return '#5';
  }
  if (interval === 11 && leftQuality !== 'Maj7') return 'Maj7';

  return candidates[0].replace('b', '♭');
}

export function analyzeNoteAgainstLeft(
  leftRoot: string,
  leftQuality: LeftQuality,
  note: string,
  leftTonePcs: Set<number>,
): { interval: number; degree: string; classification: NoteAnalysis['classification'] } {
  const rootPc = noteNameToPc(leftRoot);
  const notePc = noteNameToPc(note);
  const interval = intervalFromRoot(rootPc, notePc);
  const classification = classifyInterval(interval, leftQuality, leftTonePcs.has(notePc));
  const degree = degreeForInterval(interval, leftQuality, classification);
  return { interval, degree, classification };
}

function classifyInterval(
  interval: number,
  leftQuality: LeftQuality,
  isLeftTone: boolean,
): NoteAnalysis['classification'] {
  if (isLeftTone) return 'chord-tone';

  const rules = TENSION_RULES[leftQuality];
  if (rules.avoid.includes(interval)) return 'avoid';
  if (rules.tensions.includes(interval)) return 'tension';
  if (rules.conditional.includes(interval)) return 'conditional';
  if ([0, 3, 4, 7, 10, 11].includes(interval)) return 'chord-tone';
  return 'avoid';
}

/** 半音 interval ベースのテンション規則 */
export const TENSION_RULES: Record<
  LeftQuality,
  { tensions: number[]; conditional: number[]; avoid: number[] }
> = {
  '7': {
    tensions: [1, 2, 3, 6, 8, 9], // b9, 9, #9, #11, b13, 13
    conditional: [5], // natural 11
    avoid: [11], // Maj7 on dom7
  },
  m7: {
    tensions: [1, 2, 5, 9], // b9/9, 11, 13
    conditional: [8], // b13
    avoid: [4, 11], // Maj3, Maj7
  },
  Maj7: {
    tensions: [2, 6, 9], // 9, #11, 13
    conditional: [],
    avoid: [1, 5, 10], // b9, natural 11, b7
  },
  'm7b5': {
    tensions: [1, 2, 5, 8], // b9/9, 11, b13
    conditional: [2],
    avoid: [4, 9, 11], // Maj3, natural 13, Maj7
  },
};

export function normalizeDegreeLabel(degree: string): string {
  return degree.replace(/b(?=\d)/g, '♭');
}

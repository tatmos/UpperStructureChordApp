import {
  LEFT_ROOT_SEQUENCE,
  noteNameToPc,
  pc,
  spellForRoot,
  spellTriadTone,
  toReadableSpelling,
} from './notes';
import type { LeftChord, LeftQuality, TriadQuality, UpperTriad } from './types';

const LEFT_INTERVALS: Record<LeftQuality, number[]> = {
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  Maj7: [0, 4, 7, 11],
  'm7b5': [0, 3, 6, 10],
};

const TRIAD_INTERVALS: Record<TriadQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  augmented: [0, 4, 8],
  diminished: [0, 3, 6],
};

const ALL_ROOTS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

export function buildLeftChord(root: string, quality: LeftQuality): LeftChord {
  const rootPc = noteNameToPc(root);
  const tones = LEFT_INTERVALS[quality].map((interval) =>
    spellForRoot(root, pc(rootPc + interval)),
  );
  return { root, quality, tones };
}

export function buildLeftRows(quality: LeftQuality): LeftChord[] {
  return LEFT_ROOT_SEQUENCE.map((root) => buildLeftChord(root, quality));
}

export function buildTriad(root: string, quality: TriadQuality): UpperTriad {
  const intervals = TRIAD_INTERVALS[quality];
  const tones = intervals.map((interval) => spellTriadTone(root, quality, interval));
  const readableTones = toReadableSpelling(tones);
  const hasComplex = tones.some((t, i) => t !== readableTones[i]);
  return {
    root,
    quality,
    tones,
    readableTones: hasComplex ? readableTones : undefined,
  };
}

export function allTriadRoots(): string[] {
  return ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
}

export function formatLeftSymbol(
  chord: LeftChord,
  notation: { maj7: string; m7b5: string },
): string {
  const { root, quality } = chord;
  switch (quality) {
    case '7':
      return `${root}7`;
    case 'm7':
      return `${root}m7`;
    case 'Maj7':
      return notation.maj7 === '△7' ? `${root}△7` : `${root}Maj7`;
    case 'm7b5':
      return notation.m7b5 === 'ø7' ? `${root}ø7` : `${root}m7♭5`;
  }
}

export function formatTriadSymbol(
  triad: UpperTriad,
  notation: { dim: string; aug: string },
): string {
  const { root, quality } = triad;
  switch (quality) {
    case 'major':
      return root;
    case 'minor':
      return `${root}m`;
    case 'augmented':
      return notation.aug === '+' ? `${root}+` : `${root}aug`;
    case 'diminished':
      return notation.dim === '°' ? `${root}°` : `${root}dim`;
  }
}

export function leftGuideTones(chord: LeftChord): { third: string; seventh: string } {
  const rootPc = noteNameToPc(chord.root);
  const thirdInterval = chord.quality === 'm7' || chord.quality === 'm7b5' ? 3 : 4;
  const seventhInterval = chord.quality === 'Maj7' ? 11 : 10;
  return {
    third: spellForRoot(chord.root, pc(rootPc + thirdInterval)),
    seventh: spellForRoot(chord.root, pc(rootPc + seventhInterval)),
  };
}

export { ALL_ROOTS, LEFT_ROOT_SEQUENCE, TRIAD_INTERVALS };

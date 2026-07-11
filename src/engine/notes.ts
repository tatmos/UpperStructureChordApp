/** Pitch class: C=0 … B=11 */
export type PitchClass = number;

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const LEFT_ROOT_SEQUENCE = [
  'G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#',
] as const;


export function noteNameToPc(name: string): PitchClass {
  const match = name.match(/^([A-G])(#{1,2}|b{1,2})?$/);
  if (!match) throw new Error(`Invalid note name: ${name}`);
  const letter = match[1];
  const acc = match[2] ?? '';
  const basePc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter]!;
  return pc(basePc + ACCIDENTAL_OFFSET[acc]);
}

export function pcToSharpName(pcVal: PitchClass): string {
  return SHARP_NAMES[pc(pcVal)];
}

export function pcToFlatName(pcVal: PitchClass): string {
  return FLAT_NAMES[pc(pcVal)];
}

export function intervalFromRoot(rootPc: PitchClass, notePc: PitchClass): number {
  return pc(notePc - rootPc);
}

/** ルート名に合わせた基本表記（左手ルート列用） */
export function spellForRoot(rootName: string, targetPc: PitchClass): string {
  const rootVal = noteNameToPc(rootName);
  const interval = intervalFromRoot(rootVal, targetPc);
  const preferFlat = rootName.includes('b') || ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(rootName);
  const sharpName = pcToSharpName(targetPc);
  const flatName = pcToFlatName(targetPc);

  if (interval === 1) {
    // b9 文脈ではフラット系を優先（G7→Ab, G#は使わない）
    return flatName;
  }
  if (interval === 6) {
    // #11 / b5 — 文脈依存だがシャープ系をデフォルト
    return sharpName.includes('#') ? sharpName : flatName;
  }
  if (preferFlat && flatName.includes('b')) return flatName;
  if (!preferFlat && sharpName.includes('#')) return sharpName;
  return preferFlat ? flatName : sharpName;
}

const ACCIDENTAL_OFFSET: Record<string, number> = {
  '': 0, '#': 1, 'b': -1, '##': 2, 'bb': -2,
};

export function pc(n: number): PitchClass {
  return ((n % 12) + 12) % 12;
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export function spellTriadTone(
  triadRoot: string,
  _triadQuality: 'major' | 'minor' | 'augmented' | 'diminished',
  semitonesFromRoot: number,
): string {
  const rootVal = noteNameToPc(triadRoot);
  const targetPc = pc(rootVal + semitonesFromRoot);

  if (semitonesFromRoot === 0) return triadRoot;

  const rootLetter = triadRoot[0];
  const rootLetterIdx = LETTERS.indexOf(rootLetter);

  const thirdLetterIdx = (rootLetterIdx + 2) % 7;
  const fifthLetterIdx = (rootLetterIdx + 4) % 7;
  const thirdLetter = LETTERS[thirdLetterIdx];
  const fifthLetter = LETTERS[fifthLetterIdx];

  let targetLetter: string;
  if (semitonesFromRoot === 3 || semitonesFromRoot === 4) targetLetter = thirdLetter;
  else if (semitonesFromRoot === 6 || semitonesFromRoot === 7 || semitonesFromRoot === 8) {
    targetLetter = fifthLetter;
  } else {
    return spellForRoot(triadRoot, targetPc);
  }

  const naturalPc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[targetLetter]!;
  let diff = pc(targetPc - naturalPc);
  if (diff > 6) diff -= 12;

  if (diff === 0) return targetLetter;
  if (diff === 1) return `${targetLetter}#`;
  if (diff === -1) return `${targetLetter}b`;
  if (diff === 2) return `${targetLetter}##`;
  if (diff === -2) return `${targetLetter}bb`;

  return spellForRoot(triadRoot, targetPc);
}

export function spellStackedInterval(baseNote: string, semitones: 5 | 7): string {
  const basePc = noteNameToPc(baseNote);
  const targetPc = pc(basePc + semitones);
  const baseLetterIdx = LETTERS.indexOf(baseNote[0]);
  const letterSteps = semitones === 5 ? 3 : 4;
  const targetLetter = LETTERS[(baseLetterIdx + letterSteps) % 7];
  const naturalPc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[targetLetter]!;
  let diff = pc(targetPc - naturalPc);
  if (diff > 6) diff -= 12;

  if (diff === 0) return targetLetter;
  if (diff === 1) return `${targetLetter}#`;
  if (diff === -1) return `${targetLetter}b`;
  if (diff === 2) return `${targetLetter}##`;
  if (diff === -2) return `${targetLetter}bb`;

  return spellForRoot(baseNote, targetPc);
}

/** 可読性優先：ダブルアクシデンタルを単純化 */
export function toReadableSpelling(theoretical: string[]): string[] {
  return theoretical.map((n) => {
    if (n === 'Cb') return 'B';
    if (n === 'Ebb') return 'D';
    if (n === 'Fb') return 'E';
    if (n.endsWith('bb')) {
      const letter = n[0];
      const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter]!;
      return pcToFlatName(pc(natural - 2));
    }
    return n;
  });
}

export function tonesToString(tones: string[]): string {
  return tones.join('–');
}

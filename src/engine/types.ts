export type LeftQuality = '7' | 'm7' | 'Maj7' | 'm7b5' | 'quartal' | 'quintal';
export type TriadQuality = 'major' | 'minor' | 'augmented' | 'diminished' | 'quartal' | 'quintal';
export type StabilityLabel = 'recommended' | 'colorful' | 'high-tension';
export type StabilityFilter = 'recommended' | 'colorful' | 'all';

export type NotationStyle = {
  maj7: 'Maj7' | '△7';
  m7b5: 'm7♭5' | 'ø7';
  dim: 'dim' | '°';
  aug: 'aug' | '+';
};

export interface LeftChord {
  root: string;
  quality: LeftQuality;
  tones: string[];
}

export interface UpperTriad {
  root: string;
  quality: TriadQuality;
  tones: string[];
  /** 可読性優先の構成音（異名同音を簡略化した場合） */
  readableTones?: string[];
}

export interface NoteAnalysis {
  note: string;
  degree: string;
  classification: 'chord-tone' | 'tension' | 'conditional' | 'avoid';
}

export interface DetailExplanation {
  leftChordDisplay: string;
  rightChordDisplay: string;
  degreeLine: string;
  addedTensions: string;
  impliedSound: string;
  evaluation: string;
  selectionReason: string;
  caution: string;
}

export interface CombinationResult {
  leftChord: LeftChord;
  upperTriad: UpperTriad;
  functions: string[];
  noteAnalyses: NoteAnalysis[];
  score: number;
  rawScore: number;
  label: StabilityLabel;
  reasonCodes: string[];
  shortExplanation: string;
  detail: DetailExplanation;
  guideToneConflicts: string[];
}

export interface CellCandidate {
  result: CombinationResult | null;
  pool: CombinationResult[];
}

export interface TableRow {
  leftRoot: string;
  leftChord: LeftChord;
  cells: Record<TriadQuality, CellCandidate>;
}

export interface AppSettings {
  leftQuality: LeftQuality;
  stabilityFilter: StabilityFilter;
  notation: NotationStyle;
  lockLeftType: boolean;
}

export interface TableState {
  rows: TableRow[];
  seed: number;
}

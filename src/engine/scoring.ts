import { leftGuideTones } from './chords';
import { analyzeNoteAgainstLeft } from './degrees';
import { noteNameToPc, tonesToString } from './notes';
import type {
  CombinationResult,
  DetailExplanation,
  LeftChord,
  NoteAnalysis,
  StabilityLabel,
  TriadQuality,
  UpperTriad,
} from './types';

const SCORE_WEIGHTS = {
  chordToneOrTension: 2,
  containsThirdOrSeventh: 1,
  newColorTension: 1,
  idiomaticPattern: 2,
  conditional: -1,
  avoid: -4,
  guideToneConflict: -3,
  conflictingFifth: -2,
};

const KNOWN_PATTERNS: Record<string, string[]> = {
  '7-major': ['9,#11,13', '9,13'],
  '7-minor': ['13,Root,3', '9,3,5', 'Root,3,13'],
  '7-augmented': ['b5,b7,9', 'b9,b7,9'],
  '7-diminished': ['b9,3,5', 'b9,3,7'],
  'm7-major': ['9,11,13'],
  'Maj7-major': ['9,#11,13'],
};

export function evaluateCombination(
  left: LeftChord,
  triad: UpperTriad,
): CombinationResult {
  const leftTonePcs = new Set(left.tones.map(noteNameToPc));
  const displayTones = triad.readableTones ?? triad.tones;

  const noteAnalyses: NoteAnalysis[] = triad.tones.map((note, i) => {
    const { degree, classification } = analyzeNoteAgainstLeft(
      left.root,
      left.quality,
      note,
      leftTonePcs,
    );
    return {
      note: displayTones[i] ?? note,
      degree: normalizeDisplayDegree(degree),
      classification,
    };
  });

  const functions = noteAnalyses
    .filter((n) => n.classification !== 'avoid')
    .map((n) => n.degree);

  const guideTones = leftGuideTones(left);
  const guideToneConflicts = findGuideToneConflicts(
    left.root,
    triad.tones,
    guideTones,
    noteAnalyses,
  );

  const { rawScore, reasonCodes } = computeScore(
    left,
    triad,
    noteAnalyses,
    guideToneConflicts,
    functions,
  );

  const score = Math.max(0, Math.min(100, rawScore));
  const label = labelFromScore(score);

  const detail = buildDetail(left, triad, noteAnalyses, functions, label, reasonCodes, guideToneConflicts);
  const shortExplanation = buildShortExplanation(noteAnalyses, functions, label, guideToneConflicts, left.quality);

  return {
    leftChord: left,
    upperTriad: triad,
    functions,
    noteAnalyses,
    score,
    rawScore,
    label,
    reasonCodes,
    shortExplanation,
    detail,
    guideToneConflicts,
  };
}

function normalizeDisplayDegree(degree: string): string {
  if (degree === 'Root') return 'Root';
  return degree.replace(/b(?=\d)/g, '♭');
}

function findGuideToneConflicts(
  _leftRoot: string,
  triadTones: string[],
  guide: { third: string; seventh: string },
  analyses: NoteAnalysis[],
): string[] {
  const conflicts: string[] = [];
  const thirdPc = noteNameToPc(guide.third);
  const seventhPc = noteNameToPc(guide.seventh);

  triadTones.forEach((tone, i) => {
    const analysis = analyses[i];
    // 理論上妥当なテンション／コードトーンの半音関係（9th-3rd, 13th-♭7 等）は許容
    if (!analysis || analysis.classification === 'tension' || analysis.classification === 'chord-tone') {
      return;
    }

    const tonePc = noteNameToPc(tone);
    const intervalToThird = ((tonePc - thirdPc + 12) % 12);
    const intervalToSeventh = ((tonePc - seventhPc + 12) % 12);

    if (intervalToThird === 1 || intervalToThird === 11) {
      conflicts.push(`${tone} ↔ 3rd（半音衝突）`);
    }
    if (intervalToSeventh === 1 || intervalToSeventh === 11) {
      conflicts.push(`${tone} ↔ 7th（半音衝突）`);
    }
  });

  return conflicts;
}

function computeScore(
  left: LeftChord,
  triad: UpperTriad,
  analyses: NoteAnalysis[],
  guideConflicts: string[],
  functions: string[],
): { rawScore: number; reasonCodes: string[] } {
  let points = 0;
  const reasons: string[] = [];

  const tensionCount = analyses.filter((a) => a.classification === 'tension').length;
  const avoidCount = analyses.filter((a) => a.classification === 'avoid').length;
  const conditionalCount = analyses.filter((a) => a.classification === 'conditional').length;
  const chordToneCount = analyses.filter((a) => a.classification === 'chord-tone').length;

  points += (tensionCount + chordToneCount) * SCORE_WEIGHTS.chordToneOrTension;
  if (tensionCount + chordToneCount > 0) reasons.push('VALID_FUNCTIONS');

  const hasThirdOrSeventh = analyses.some(
    (a) => a.degree === '3' || a.degree === '♭3' || a.degree === '♭7' || a.degree === '7',
  );
  if (hasThirdOrSeventh) {
    points += SCORE_WEIGHTS.containsThirdOrSeventh;
    reasons.push('GUIDE_TONE_PRESENCE');
  }

  if (tensionCount >= 2) {
    points += SCORE_WEIGHTS.newColorTension;
    reasons.push('COLOR_TENSION');
  }

  const patternKey = `${left.quality}-${triad.quality}`;
  const fnKey = functions.join(',');
  if (KNOWN_PATTERNS[patternKey]?.some((p) => p === fnKey || fnKey.includes(p.split(',')[0]))) {
    points += SCORE_WEIGHTS.idiomaticPattern;
    reasons.push('IDIOMATIC_PATTERN');
  }

  if (left.quality === '7' && functions.includes('#11') && functions.includes('9') && functions.includes('13')) {
    points += SCORE_WEIGHTS.idiomaticPattern;
    reasons.push('LYDIAN_DOMINANT');
  }
  if (left.quality === '7' && functions.includes('♭9')) {
    points += 1;
    reasons.push('ALTERED_TENSION');
  }

  if (left.quality === 'm7' && functions.includes('9') && functions.includes('11')) {
    points += SCORE_WEIGHTS.idiomaticPattern;
    reasons.push('DORIAN_TENSIONS');
  }

  if (left.quality === 'Maj7' && functions.includes('9') && functions.includes('#11')) {
    points += SCORE_WEIGHTS.idiomaticPattern;
    reasons.push('LYDIAN_TENSIONS');
  }

  if (left.quality === 'm7b5' && functions.includes('11') && functions.includes('♭9')) {
    points += 1;
    reasons.push('LOCRIAN_TENSIONS');
  }

  points += conditionalCount * SCORE_WEIGHTS.conditional;
  points -= avoidCount * Math.abs(SCORE_WEIGHTS.avoid);
  points -= guideConflicts.length * Math.abs(SCORE_WEIGHTS.guideToneConflict);

  if (guideConflicts.length === 0 && avoidCount === 0) {
    points += 2;
    reasons.push('NO_GUIDE_TONE_CONFLICT');
  }

  const hasSharp5 = analyses.some((a) => a.degree === '#5');
  const hasNatural5 = analyses.some((a) => a.degree === '5');
  if (hasSharp5 && hasNatural5) points += SCORE_WEIGHTS.conflictingFifth;

  // 正の点数を 80〜100 付近にマッピング（代表例: G7+A ≒ 92）
  const rawScore = Math.max(0, Math.min(100, Math.round(28 + points * 5)));
  return { rawScore, reasonCodes: reasons };
}

function labelFromScore(score: number): StabilityLabel {
  if (score >= 80) return 'recommended';
  if (score >= 60) return 'colorful';
  return 'high-tension';
}

function buildShortExplanation(
  analyses: NoteAnalysis[],
  functions: string[],
  label: StabilityLabel,
  conflicts: string[],
  leftQuality: string,
): string {
  if (analyses.every((a) => a.classification === 'avoid')) {
    return '使用可能なテンションなし';
  }
  if (conflicts.length > 0 && label === 'high-tension') {
    return 'ガイドトーンと半音衝突。高緊張';
  }
  const tensions = functions.filter((f) => !['Root', '3', '♭3', '5', '♭7', '7'].includes(f));
  if (tensions.length > 0) {
    const style =
      leftQuality === '7' && tensions.includes('#11')
        ? 'Lydian Dominant系'
        : leftQuality === '7' && tensions.includes('♭9')
          ? 'Altered系'
          : '';
    return `${tensions.join('・')}を追加。${style || (label === 'recommended' ? '比較的安定' : '色彩的')}`;
  }
  if (functions.includes('Root') && functions.includes('3')) {
    return 'Root・3rdを含む。比較的安定';
  }
  return functions.join('・') + 'を含む';
}

function buildDetail(
  left: LeftChord,
  triad: UpperTriad,
  analyses: NoteAnalysis[],
  functions: string[],
  label: StabilityLabel,
  reasonCodes: string[],
  conflicts: string[],
): DetailExplanation {
  const displayTones = triad.readableTones ?? triad.tones;
  const leftDisplay = `${left.root}${qualitySuffix(left.quality)} = ${tonesToString(left.tones)}`;
  const rightDisplay = `${triad.root}${triadQualitySuffix(triad.quality)} = ${tonesToString(displayTones)}`;

  if (triad.readableTones) {
    const theoretical = tonesToString(triad.tones);
    if (theoretical !== tonesToString(displayTones)) {
      // 詳細欄に理論綴りを残す
    }
  }

  const degreeLine = analyses.map((a) => `${a.note}=${a.degree}`).join(', ');
  const addedTensions = functions
    .filter((f) => !['Root', '3', '♭3', '5', '♭7', '7'].includes(f))
    .join(', ') || '—';

  const implied = buildImpliedSymbol(left, functions);
  const evaluation = labelToJapanese(label);
  const selectionReason = buildSelectionReason(reasonCodes, functions, conflicts);
  const caution = buildCaution(left, functions, conflicts, label);

  return {
    leftChordDisplay: leftDisplay,
    rightChordDisplay: rightDisplay,
    degreeLine,
    addedTensions,
    impliedSound: implied,
    evaluation,
    selectionReason,
    caution,
  };
}

function qualitySuffix(q: string): string {
  switch (q) {
    case '7': return '7';
    case 'm7': return 'm7';
    case 'Maj7': return 'Maj7';
    case 'm7b5': return 'm7♭5';
    default: return q;
  }
}

function triadQualitySuffix(q: TriadQuality): string {
  switch (q) {
    case 'major': return '';
    case 'minor': return 'm';
    case 'augmented': return 'aug';
    case 'diminished': return 'dim';
  }
}

function buildImpliedSymbol(left: LeftChord, functions: string[]): string {
  if (left.quality === '7') {
    const parts: string[] = [left.root];
    if (functions.includes('♭9')) parts.push('(♭9)');
    else if (functions.includes('9')) parts.push('(9)');
    if (functions.includes('#11')) parts.push('(#11)');
    if (functions.includes('13')) parts.push('13');
    else if (functions.includes('♭13')) parts.push('(♭13)');
    if (parts.length === 1) return `${left.root}7 系`;
    return parts.join('') + ' 系';
  }
  return `${left.root}${qualitySuffix(left.quality)} 系`;
}

function labelToJapanese(label: StabilityLabel): string {
  switch (label) {
    case 'recommended': return '推奨／明るく浮遊感';
    case 'colorful': return '色彩的／やや浮遊';
    case 'high-tension': return '高緊張／注意して使用';
  }
}

function buildSelectionReason(codes: string[], functions: string[], conflicts: string[]): string {
  if (conflicts.length > 0) {
    return '有効なテンションはあるが、ガイドトーンとの半音衝突に注意が必要。';
  }
  if (codes.includes('LYDIAN_DOMINANT')) {
    return 'ガイドトーンを壊さず、3つの有効テンションを一度に追加する。';
  }
  if (codes.includes('NO_GUIDE_TONE_CONFLICT') && functions.length >= 2) {
    return 'ガイドトーンを壊さず、有効な上部構造テンションを追加する。';
  }
  if (functions.includes('Root') && functions.includes('3')) {
    return 'Rootと3rdを保ちつつテンションを追加。安定した響き。';
  }
  if (functions.includes('♭9')) {
    return '典型的なドミナント解決の上部構造。解決感が強い。';
  }
  return '理論上解釈可能な構成音の組み合わせ。';
}

function buildCaution(
  left: LeftChord,
  functions: string[],
  conflicts: string[],
  label: StabilityLabel,
): string {
  if (conflicts.length > 0) return conflicts.join(' ');
  if (functions.includes('#11') && left.quality === '7') {
    return '#11の色が強い。MixolydianよりLydian Dominantに近い。';
  }
  if (functions.includes('♭9')) return '♭9は解決感が強い。声部進行に注意。';
  if (label === 'high-tension') return '高い緊張度。スタイルに応じて使用。';
  return '特になし';
}

export function passesFilter(result: CombinationResult, filter: import('./types').StabilityFilter): boolean {
  if (result.score < 40) return false;
  switch (filter) {
    case 'recommended':
      return result.label === 'recommended';
    case 'colorful':
      return result.label === 'recommended' || result.label === 'colorful';
    case 'all':
      return true;
  }
}

export { SCORE_WEIGHTS };

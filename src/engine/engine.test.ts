import { describe, it, expect } from 'vitest';
import {
  buildLeftChord,
  buildLeftRows,
  buildTriad,
  buildTable,
  evaluateCombination,
  formatTriadSymbol,
  LEFT_ROOT_SEQUENCE,
  noteNameToPc,
  parseSeed,
  passesFilter,
  TRIAD_QUALITIES,
} from './index';

describe('左手コード生成 FR-01', () => {
  it('G7から始まり12キー半音上行する', () => {
    const rows = buildLeftRows('7');
    expect(rows.map((r) => r.root)).toEqual([...LEFT_ROOT_SEQUENCE]);
    rows.forEach((r) => {
      expect(r.quality).toBe('7');
      expect(r.tones).toHaveLength(4);
    });
  });

  it('全行が同じ品質を維持する', () => {
    for (const q of ['7', 'm7', 'Maj7', 'm7b5', 'quartal', 'quintal'] as const) {
      const rows = buildLeftRows(q);
      expect(rows.every((r) => r.quality === q)).toBe(true);
    }
  });
});

describe('受け入れ条件: G7 + 代表例', () => {
  const g7 = buildLeftChord('G', '7');

  it('G7 + A Major → 9, #11, 13', () => {
    const triad = buildTriad('A', 'major');
    expect(triad.tones.join('–')).toBe('A–C#–E');
    const result = evaluateCombination(g7, triad);
    expect(result.functions).toContain('9');
    expect(result.functions).toContain('#11');
    expect(result.functions).toContain('13');
    expect(result.noteAnalyses.map((n) => n.degree)).toEqual(['9', '#11', '13']);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.label).toBe('recommended');
  });

  it('G7 + Em → 13, Root, 3', () => {
    const triad = buildTriad('E', 'minor');
    const result = evaluateCombination(g7, triad);
    const degrees = result.noteAnalyses.map((n) => n.degree);
    expect(degrees).toContain('13');
    expect(degrees).toContain('Root');
    expect(degrees).toContain('3');
    expect(triad.tones.join('–')).toBe('E–G–B');
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.label).toBe('recommended');
  });

  it('G7 + Abdim → ♭9, 3, 5（G#dimではない）', () => {
    const triad = buildTriad('Ab', 'diminished');
    const symbol = formatTriadSymbol(triad, { dim: 'dim', aug: 'aug' });
    expect(symbol).toBe('Abdim');
    expect(symbol).not.toContain('G#');
    const result = evaluateCombination(g7, triad);
    const degrees = result.noteAnalyses.map((n) => n.degree);
    expect(degrees).toContain('♭9');
    expect(degrees).toContain('3');
    expect(degrees).toContain('5');
  });

  it('G7 + Dbaug → Altered寄り', () => {
    const triad = buildTriad('Db', 'augmented');
    const result = evaluateCombination(g7, triad);
    expect(result.score).toBeGreaterThan(40);
    expect(result.functions.length).toBeGreaterThan(0);
  });
});

describe('4度重ね・5度重ね', () => {
  it('C 4度重ね = C–F–Bb–Eb', () => {
    const chord = buildLeftChord('C', 'quartal');
    expect(chord.tones).toEqual(['C', 'F', 'Bb', 'Eb']);
  });

  it('C 5度重ね = C–G–D–A', () => {
    const chord = buildLeftChord('C', 'quintal');
    expect(chord.tones).toEqual(['C', 'G', 'D', 'A']);
  });

  it('右手 C 4度重ね = C–F–Bb', () => {
    const triad = buildTriad('C', 'quartal');
    expect(triad.tones).toEqual(['C', 'F', 'Bb']);
  });

  it('右手 C 5度重ね = C–G–D', () => {
    const triad = buildTriad('C', 'quintal');
    expect(triad.tones).toEqual(['C', 'G', 'D']);
  });

  it('4度重ねでも推奨候補が存在する', () => {
    const settings = {
      leftQuality: 'quartal' as const,
      stabilityFilter: 'recommended' as const,
      notation: { maj7: 'Maj7' as const, m7b5: 'm7♭5' as const, dim: 'dim' as const, aug: 'aug' as const },
      lockLeftType: true,
    };
    const table = buildTable(settings, 42);
    const filled = table.rows.flatMap((r) =>
      TRIAD_QUALITIES.map((q) => r.cells[q].result),
    ).filter(Boolean);
    expect(filled.length).toBeGreaterThan(0);
  });

  it('G7 + 右手4度重ね列で候補が存在する', () => {
    const settings = {
      leftQuality: '7' as const,
      stabilityFilter: 'colorful' as const,
      notation: { maj7: 'Maj7' as const, m7b5: 'm7♭5' as const, dim: 'dim' as const, aug: 'aug' as const },
      lockLeftType: true,
    };
    const table = buildTable(settings, 42);
    const quartalCells = table.rows.map((r) => r.cells.quartal.result).filter(Boolean);
    expect(quartalCells.length).toBeGreaterThan(0);
  });
});

describe('m7 推奨候補', () => {
  it('Gm7 でも推奨候補が存在する', () => {
    const settings = {
      leftQuality: 'm7' as const,
      stabilityFilter: 'recommended' as const,
      notation: { maj7: 'Maj7' as const, m7b5: 'm7♭5' as const, dim: 'dim' as const, aug: 'aug' as const },
      lockLeftType: true,
    };
    const table = buildTable(settings, 1);
    const filled = table.rows.flatMap((r) =>
      TRIAD_QUALITIES.map((q) => r.cells[q].result),
    ).filter(Boolean);
    expect(filled.length).toBeGreaterThan(0);
  });
});

describe('G7 推奨候補', () => {
  it('推奨のみでも表が埋まる', () => {
    const settings = {
      leftQuality: '7' as const,
      stabilityFilter: 'recommended' as const,
      notation: { maj7: 'Maj7' as const, m7b5: 'm7♭5' as const, dim: 'dim' as const, aug: 'aug' as const },
      lockLeftType: true,
    };
    const table = buildTable(settings, 1);
    const filled = table.rows.flatMap((r) =>
      TRIAD_QUALITIES.map((q) => r.cells[q].result),
    ).filter(Boolean);
    expect(filled.length).toBeGreaterThan(20);
  });
});

describe('スコアとフィルター', () => {
  const filterSettings = {
    leftQuality: '7' as const,
    stabilityFilter: 'recommended' as const,
    notation: { maj7: 'Maj7' as const, m7b5: 'm7♭5' as const, dim: 'dim' as const, aug: 'aug' as const },
    lockLeftType: true,
  };

  it('閾値未満は候補プールから除外される', () => {
    const table = buildTable(filterSettings, 12345);
    for (const row of table.rows) {
      for (const q of TRIAD_QUALITIES) {
        const cell = row.cells[q];
        if (cell.result) {
          expect(passesFilter(cell.result, filterSettings.stabilityFilter)).toBe(true);
          expect(cell.result.score).toBeGreaterThanOrEqual(40);
        }
        for (const p of cell.pool) {
          expect(passesFilter(p, filterSettings.stabilityFilter)).toBe(true);
        }
      }
    }
  });
});

describe('再現可能性 FR-07', () => {
  it('シード文字列を解釈できる', () => {
    expect(parseSeed('99999')).toBe(99999);
    expect(parseSeed(' 4294967295 ')).toBe(4294967295);
    expect(parseSeed('0')).toBe(0);
    expect(parseSeed('')).toBeNull();
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('4294967296')).toBeNull();
    expect(parseSeed('abc')).toBeNull();
  });

  it('同一シードと設定で同一結果', () => {
    const settings = {
      leftQuality: '7' as const,
      stabilityFilter: 'recommended' as const,
      notation: { maj7: 'Maj7' as const, m7b5: 'm7♭5' as const, dim: 'dim' as const, aug: 'aug' as const },
      lockLeftType: true,
    };
    const a = buildTable(settings, 99999);
    const b = buildTable(settings, 99999);
    expect(a.rows.map((r) => r.cells.major.result?.upperTriad.root)).toEqual(
      b.rows.map((r) => r.cells.major.result?.upperTriad.root),
    );
  });
});

describe('12キー移調', () => {
  it('相対的な音程関係が維持される', () => {
    const ref = evaluateCombination(buildLeftChord('G', '7'), buildTriad('A', 'major'));
    const transposed = evaluateCombination(buildLeftChord('Ab', '7'), buildTriad('Bb', 'major'));
    expect(ref.functions).toEqual(transposed.functions);
  });
});

describe('音程計算', () => {
  it('noteNameToPc が正しく動作する', () => {
    expect(noteNameToPc('G')).toBe(7);
    expect(noteNameToPc('Ab')).toBe(8);
    expect(noteNameToPc('C#')).toBe(1);
  });
});

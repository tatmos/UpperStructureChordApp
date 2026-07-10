import { buildLeftRows, buildTriad, allTriadRoots } from './chords';
import { evaluateCombination, passesFilter } from './scoring';
import { createSeededRandom, pickFromPool } from './seed';
import type {
  AppSettings,
  CellCandidate,
  CombinationResult,
  LeftQuality,
  TableRow,
  TableState,
  TriadQuality,
} from './types';

const TRIAD_QUALITIES: TriadQuality[] = ['major', 'minor', 'augmented', 'diminished'];

export function generateCandidatePool(
  leftQuality: LeftQuality,
  triadQuality: TriadQuality,
  leftRoot: string,
): CombinationResult[] {
  const leftRows = buildLeftRows(leftQuality);
  const left = leftRows.find((c) => c.root === leftRoot)!;
  const roots = allTriadRoots();

  return roots
    .map((root) => evaluateCombination(left, buildTriad(root, triadQuality)))
    .sort((a, b) => b.score - a.score);
}

export function buildTable(settings: AppSettings, seed: number, selections?: Map<string, number>): TableState {
  const leftRows = buildLeftRows(settings.leftQuality);
  const rng = createSeededRandom(seed);

  const rows: TableRow[] = leftRows.map((left) => {
    const cells = {} as Record<TriadQuality, CellCandidate>;

    for (const quality of TRIAD_QUALITIES) {
      const pool = generateCandidatePool(settings.leftQuality, quality, left.root).filter((r) =>
        passesFilter(r, settings.stabilityFilter),
      );

      const key = `${left.root}:${quality}`;
      let selected: CombinationResult | null = null;

      if (pool.length > 0) {
        const index = selections?.has(key)
          ? selections.get(key)! % pool.length
          : pickFromPool(rng, pool.length);
        selected = pool[index];
      }

      cells[quality] = { result: selected, pool };
    }

    return { leftRoot: left.root, leftChord: left, cells };
  });

  return { rows, seed };
}

export function rerollCell(
  table: TableState,
  _settings: AppSettings,
  rowIndex: number,
  triadQuality: TriadQuality,
  seed: number,
): TableState {
  const row = table.rows[rowIndex];
  const cell = row.cells[triadQuality];
  if (cell.pool.length <= 1) return table;

  const rng = createSeededRandom(seed);
  const currentIndex = cell.result
    ? cell.pool.findIndex((p) => p.upperTriad.root === cell.result!.upperTriad.root)
    : -1;

  let newIndex = pickFromPool(rng, cell.pool.length);
  if (cell.pool.length > 1) {
    let attempts = 0;
    while (newIndex === currentIndex && attempts < 10) {
      newIndex = pickFromPool(rng, cell.pool.length);
      attempts++;
    }
  }

  const newRows = table.rows.map((r, i) => {
    if (i !== rowIndex) return r;
    return {
      ...r,
      cells: {
        ...r.cells,
        [triadQuality]: {
          ...r.cells[triadQuality],
          result: r.cells[triadQuality].pool[newIndex] ?? null,
        },
      },
    };
  });

  return { rows: newRows, seed };
}

export function rerollAll(_table: TableState, settings: AppSettings, seed: number): TableState {
  return buildTable(settings, seed);
}

export function rerollTableKeepingSelections(
  table: TableState,
  settings: AppSettings,
  seed: number,
): TableState {
  const selections = new Map<string, number>();
  const rng = createSeededRandom(seed);

  for (const row of table.rows) {
    for (const quality of TRIAD_QUALITIES) {
      const pool = row.cells[quality].pool.filter((r) => passesFilter(r, settings.stabilityFilter));
      if (pool.length > 0) {
        selections.set(`${row.leftRoot}:${quality}`, pickFromPool(rng, pool.length));
      }
    }
  }

  return buildTable(settings, seed, selections);
}

export { TRIAD_QUALITIES };

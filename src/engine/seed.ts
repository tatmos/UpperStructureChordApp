/** Mulberry32 — 決定論的 PRNG */
export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFromPool(rng: () => number, poolSize: number): number {
  if (poolSize <= 0) return 0;
  return Math.floor(rng() * poolSize);
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

/** クリップボードや入力欄からシード値を解釈（0〜4294967295） */
export function parseSeed(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) return null;
  return n;
}

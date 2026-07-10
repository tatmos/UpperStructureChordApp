import { Player } from '@magenta/music/esm/core/player.js';
import { SoundFont } from '@magenta/music/esm/core/soundfont.js';
import { DEFAULT_VELOCITY } from '@magenta/music/esm/core/constants.js';
import { SGM_PLUS_URL } from './gmInstruments';

const Tone = Player.tone;

let soundFont: SoundFont | null = null;
let loadPromise: Promise<SoundFont> | null = null;
let loadError: string | null = null;
let output: ReturnType<typeof Tone.getDestination> | null = null;

export type SoundFontLoadState = 'idle' | 'loading' | 'ready' | 'error';

let loadState: SoundFontLoadState = 'idle';
const listeners = new Set<(state: SoundFontLoadState) => void>();

function setLoadState(state: SoundFontLoadState) {
  loadState = state;
  listeners.forEach((fn) => fn(state));
}

export function getSoundFontLoadState(): SoundFontLoadState {
  return loadState;
}

export function subscribeSoundFontLoadState(fn: (state: SoundFontLoadState) => void): () => void {
  listeners.add(fn);
  fn(loadState);
  return () => listeners.delete(fn);
}

export function getSoundFontError(): string | null {
  return loadError;
}

export async function ensureSoundFont(): Promise<SoundFont> {
  if (soundFont) return soundFont;
  if (loadPromise) return loadPromise;

  setLoadState('loading');
  loadError = null;

  loadPromise = (async () => {
    await Tone.start();
    output = Tone.getDestination();
    const sf = new SoundFont(SGM_PLUS_URL);
    await sf.initialize();
    soundFont = sf;
    setLoadState('ready');
    return sf;
  })().catch((err: Error) => {
    loadPromise = null;
    soundFont = null;
    loadError = err.message;
    setLoadState('error');
    throw err;
  });

  return loadPromise;
}

/** @deprecated ensureSoundFont のエイリアス */
export const ensureSoundFontPlayer = ensureSoundFont;

export { DEFAULT_VELOCITY };

export interface SampleRequest {
  pitch: number;
  velocity: number;
  program: number;
}

export async function loadSamplesForNotes(samples: SampleRequest[]): Promise<void> {
  const sf = await ensureSoundFont();
  const seen = new Set<string>();
  const notes: Array<{ pitch: number; velocity: number; program: number; isDrum: false }> = [];

  for (const s of samples) {
    const vel = Math.max(1, Math.min(127, Math.round(s.velocity)));
    const key = `${s.program}:${s.pitch}:${vel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({
      pitch: s.pitch,
      velocity: vel,
      program: s.program,
      isDrum: false,
    });
  }

  if (notes.length > 0) {
    await sf.loadSamples(notes);
  }
}

export function playSoundFontNote(
  pitch: number,
  startTime: number,
  duration: number,
  program: number,
  velocity = DEFAULT_VELOCITY,
): void {
  if (!soundFont || !output) return;
  const vel = Math.max(1, Math.min(127, Math.round(velocity)));
  soundFont.playNote(pitch, vel, startTime, duration, program, false, output);
}

export function stopSoundFont(): void {
  Tone.getTransport().stop();
  Tone.getTransport().cancel();
}

export function resumeSoundFontContext(): void {
  void Tone.start();
  void Tone.getContext().resume();
}

export function toneNow(): number {
  return Tone.now();
}

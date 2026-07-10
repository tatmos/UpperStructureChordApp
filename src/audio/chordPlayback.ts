import { noteNameToPc } from '../engine/notes';
import type { CombinationResult } from '../engine/types';
import type { SoundSettings } from './gmInstruments';
import {
  DEFAULT_VELOCITY,
  ensureSoundFont,
  loadSamplesForNotes,
  playSoundFontNote,
  resumeSoundFontContext,
  stopSoundFont,
  toneNow,
} from './soundFontEngine';

export interface PlaybackNote {
  id: string;
  name: string;
  source: 'left' | 'right';
  degree?: string;
  midi: number;
}

export interface RollEvent {
  id: string;
  noteId: string;
  pitch: number;
  startTime: number;
  endTime: number;
  source: 'left' | 'right';
  name: string;
}

export const QUARTER_SEC = 0.55;
export const EIGHTH_SEC = 0.28;
export const ARPEGGIO_GAP = 0.05;
export const PIANO_ROLL_PPS = 120;
export const PIANO_ROLL_ROW_HEIGHT = 7;

function midiFromPc(pcVal: number, octave: number): number {
  return (octave + 1) * 12 + pcVal;
}

export function buildPlaybackNotes(result: CombinationResult): PlaybackNote[] {
  const leftTones = result.leftChord.tones;
  const rightTones = result.upperTriad.readableTones ?? result.upperTriad.tones;
  const leftRootPc = noteNameToPc(result.leftChord.root);
  let cursor = midiFromPc(leftRootPc, 3);
  const leftNotes: PlaybackNote[] = [];

  for (const name of leftTones) {
    const pcVal = noteNameToPc(name);
    let midi = cursor;
    while (midi % 12 !== pcVal) midi++;
    if (leftNotes.length > 0 && midi < cursor) midi += 12;
    leftNotes.push({ id: `left-${name}`, name, source: 'left', midi });
    cursor = midi + 1;
  }

  const highestLeft = leftNotes.length > 0 ? Math.max(...leftNotes.map((n) => n.midi)) : 60;
  let rightCursor = Math.max(highestLeft + 3, 60);
  const rightNotes: PlaybackNote[] = [];

  for (const name of rightTones) {
    const pcVal = noteNameToPc(name);
    let midi = rightCursor;
    while (midi % 12 !== pcVal) midi++;
    if (rightNotes.length > 0 && midi < rightCursor) midi += 12;
    const analysis = result.noteAnalyses.find((n) => n.note === name);
    rightNotes.push({
      id: `right-${name}`,
      name,
      source: 'right',
      degree: analysis?.degree,
      midi,
    });
    rightCursor = midi + 1;
  }

  return [...leftNotes, ...rightNotes];
}

export function getSortedByPitch(notes: PlaybackNote[]): PlaybackNote[] {
  return [...notes].sort((a, b) => a.midi - b.midi);
}

export function buildRollTimeline(result: CombinationResult): RollEvent[] {
  const sorted = getSortedByPitch(buildPlaybackNotes(result));
  const events: RollEvent[] = [];
  let t = 0;

  for (const n of sorted) {
    events.push({
      id: `${n.id}@chord`,
      noteId: n.id,
      pitch: n.midi,
      startTime: t,
      endTime: t + QUARTER_SEC,
      source: n.source,
      name: n.name,
    });
  }

  t += QUARTER_SEC + ARPEGGIO_GAP;

  for (const n of sorted) {
    events.push({
      id: `${n.id}@up@${t.toFixed(3)}`,
      noteId: n.id,
      pitch: n.midi,
      startTime: t,
      endTime: t + EIGHTH_SEC,
      source: n.source,
      name: n.name,
    });
    t += EIGHTH_SEC;
  }

  for (const n of [...sorted].reverse()) {
    events.push({
      id: `${n.id}@down@${t.toFixed(3)}`,
      noteId: n.id,
      pitch: n.midi,
      startTime: t,
      endTime: t + EIGHTH_SEC,
      source: n.source,
      name: n.name,
    });
    t += EIGHTH_SEC;
  }

  return events;
}

export function getTimelineDuration(events: RollEvent[]): number {
  if (events.length === 0) return 0;
  return Math.max(...events.map((e) => e.endTime));
}

export function getActiveEvents(events: RollEvent[], time: number): RollEvent[] {
  return events.filter((e) => time >= e.startTime && time < e.endTime);
}

export function midiToLabel(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${names[pc]}${oct}`;
}

export interface PlaybackCallbacks {
  onNoteStart?: (note: PlaybackNote) => void;
  onPhaseChange?: (phase: 'chord' | 'arpeggio-up' | 'arpeggio-down' | 'idle') => void;
  onTimeUpdate?: (time: number) => void;
  signal?: AbortSignal;
}

function wait(sec: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(resolve, sec * 1000);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function programForNote(source: 'left' | 'right', sound: SoundSettings): number {
  return source === 'left' ? sound.leftProgram : sound.rightProgram;
}

function phaseAtTime(t: number, noteCount: number): 'chord' | 'arpeggio-up' | 'arpeggio-down' | 'idle' {
  const chordEnd = QUARTER_SEC + ARPEGGIO_GAP;
  const upEnd = chordEnd + noteCount * EIGHTH_SEC;
  if (t < QUARTER_SEC) return 'chord';
  if (t < upEnd) return 'arpeggio-up';
  if (t < upEnd + noteCount * EIGHTH_SEC) return 'arpeggio-down';
  return 'idle';
}

export async function playCombination(
  result: CombinationResult,
  sound: SoundSettings,
  callbacks: PlaybackCallbacks = {},
): Promise<void> {
  const { onNoteStart, onPhaseChange, onTimeUpdate, signal } = callbacks;
  await ensureSoundFont();
  resumeSoundFontContext();

  const notes = buildPlaybackNotes(result);
  const sorted = getSortedByPitch(notes);
  const timeline = buildRollTimeline(result);
  const duration = getTimelineDuration(timeline);
  const noteCount = sorted.length;

  const sampleRequests = sorted.map((n) => ({
    pitch: n.midi,
    velocity: DEFAULT_VELOCITY,
    program: programForNote(n.source, sound),
  }));
  await loadSamplesForNotes(sampleRequests);

  const startAt = toneNow() + 0.12;
  let offset = 0;

  for (const n of sorted) {
    playSoundFontNote(n.midi, startAt + offset, QUARTER_SEC, programForNote(n.source, sound));
  }
  offset += QUARTER_SEC + ARPEGGIO_GAP;

  for (const n of sorted) {
    playSoundFontNote(n.midi, startAt + offset, EIGHTH_SEC, programForNote(n.source, sound));
    offset += EIGHTH_SEC;
  }

  for (const n of [...sorted].reverse()) {
    playSoundFontNote(n.midi, startAt + offset, EIGHTH_SEC, programForNote(n.source, sound));
    offset += EIGHTH_SEC;
  }

  onPhaseChange?.('chord');
  onNoteStart?.({ id: '__chord__', name: '和音', source: 'left', midi: 0 });
  onTimeUpdate?.(0);

  const wallStart = performance.now();
  let rafId = 0;
  let lastPhase: ReturnType<typeof phaseAtTime> = 'chord';

  const tick = () => {
    if (signal?.aborted) return;
    const elapsed = (performance.now() - wallStart) / 1000;
    const t = Math.min(elapsed, duration);
    onTimeUpdate?.(t);

    const ph = phaseAtTime(t, noteCount);
    if (ph !== lastPhase) {
      lastPhase = ph;
      if (ph !== 'idle') onPhaseChange?.(ph);
    }

    const active = getActiveEvents(timeline, t);
    if (active.length === noteCount && t < QUARTER_SEC) {
      onNoteStart?.({ id: '__chord__', name: '和音', source: 'left', midi: 0 });
    } else if (active.length === 1) {
      const note = notes.find((n) => n.id === active[0].noteId);
      if (note) onNoteStart?.(note);
    }

    if (t < duration) {
      rafId = requestAnimationFrame(tick);
    }
  };

  rafId = requestAnimationFrame(tick);

  try {
    await wait(duration + 0.05, signal);
    onPhaseChange?.('idle');
    onTimeUpdate?.(duration);
  } finally {
    cancelAnimationFrame(rafId);
  }
}

export function stopPlayback(): void {
  stopSoundFont();
}

export async function playSingleNote(
  note: PlaybackNote,
  sound: SoundSettings,
  callbacks: { signal?: AbortSignal } = {},
): Promise<void> {
  const { signal } = callbacks;
  await ensureSoundFont();
  resumeSoundFontContext();

  const program = programForNote(note.source, sound);
  await loadSamplesForNotes([{ pitch: note.midi, velocity: DEFAULT_VELOCITY, program }]);

  const startAt = toneNow() + 0.05;
  playSoundFontNote(note.midi, startAt, QUARTER_SEC, program);
  await wait(QUARTER_SEC + 0.05, signal);
}

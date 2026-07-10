import { useCallback, useRef, useState } from 'react';
import {
  buildPlaybackNotes,
  buildRollTimeline,
  getTimelineDuration,
  playCombination,
  playSingleNote,
  stopPlayback,
  type PlaybackNote,
} from '../audio/chordPlayback';
import type { SoundSettings } from '../audio/gmInstruments';
import type { CombinationResult } from '../engine/types';

export type PlaybackPhase = 'idle' | 'chord' | 'arpeggio-up' | 'arpeggio-down';

export function useChordPlayback(sound: SoundSettings) {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeNoteIds, setActiveNoteIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<PlaybackPhase>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [rollEvents, setRollEvents] = useState<ReturnType<typeof buildRollTimeline>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsPlaying(false);
    setPhase('idle');
    setActiveNoteId(null);
    setActiveNoteIds(new Set());
    setCurrentTime(0);
    stopPlayback();
  }, []);

  const play = useCallback(async (result: CombinationResult) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const timeline = buildRollTimeline(result);
    setRollEvents(timeline);
    setCurrentTime(0);
    setIsPlaying(true);
    setActiveNoteIds(new Set());

    const allIds = buildPlaybackNotes(result).map((n) => n.id);
    const duration = getTimelineDuration(timeline);

    try {
      await playCombination(result, soundRef.current, {
        signal: ac.signal,
        onPhaseChange: (p) => {
          if (p === 'idle') {
            setPhase('idle');
            setActiveNoteId(null);
            setActiveNoteIds(new Set());
            setCurrentTime(duration);
          } else {
            setPhase(p);
          }
        },
        onTimeUpdate: setCurrentTime,
        onNoteStart: (note: PlaybackNote) => {
          if (note.id === '__chord__') {
            setActiveNoteIds(new Set(allIds));
            setActiveNoteId(null);
            return;
          }
          setActiveNoteId(note.id);
          setActiveNoteIds(new Set([note.id]));
        },
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      throw e;
    } finally {
      if (abortRef.current === ac) {
        setIsPlaying(false);
        setPhase('idle');
        setActiveNoteId(null);
        setActiveNoteIds(new Set());
        abortRef.current = null;
      }
    }
  }, []);

  const playNote = useCallback(async (note: PlaybackNote) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRollEvents([]);
    setCurrentTime(0);
    setIsPlaying(true);
    setPhase('idle');
    setActiveNoteId(note.id);
    setActiveNoteIds(new Set([note.id]));
    stopPlayback();

    try {
      await playSingleNote(note, soundRef.current, { signal: ac.signal });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      throw e;
    } finally {
      if (abortRef.current === ac) {
        setIsPlaying(false);
        setActiveNoteId(null);
        setActiveNoteIds(new Set());
        abortRef.current = null;
      }
    }
  }, []);

  return {
    play,
    playNote,
    stop,
    isPlaying,
    phase,
    activeNoteId,
    activeNoteIds,
    currentTime,
    rollEvents,
  };
}

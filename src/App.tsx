import { useCallback, useState } from 'react';
import { DEFAULT_SOUND_SETTINGS, type SoundSettings } from './audio/gmInstruments';
import {
  buildTable,
  generateSeed,
  type AppSettings,
  type CombinationResult,
  type LeftQuality,
  type StabilityFilter,
  type TriadQuality,
} from './engine';
import { ControlPanel } from './components/ControlPanel';
import { ChordTable } from './components/ChordTable';
import { DetailPanel } from './components/DetailPanel';
import { SoundFontPanel } from './components/SoundFontPanel';
import { useChordPlayback } from './hooks/useChordPlayback';
import './App.css';

const DEFAULT_SETTINGS: AppSettings = {
  leftQuality: '7',
  stabilityFilter: 'recommended',
  notation: { maj7: 'Maj7', m7b5: 'm7♭5', dim: 'dim', aug: 'aug' },
  lockLeftType: true,
};

const TRIAD_HEADERS: Record<TriadQuality, string> = {
  major: 'Major',
  minor: 'Minor',
  augmented: 'Aug',
  diminished: 'Dim',
};

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [seed, setSeed] = useState(() => generateSeed());
  const [table, setTable] = useState(() => buildTable(DEFAULT_SETTINGS, seed));
  const [selected, setSelected] = useState<CombinationResult | null>(null);
  const [history, setHistory] = useState<{ settings: AppSettings; seed: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [sound, setSound] = useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);
  const {
    play,
    playNote,
    stop,
    isPlaying,
    phase,
    activeNoteIds,
    currentTime,
    rollEvents,
  } = useChordPlayback(sound);

  const pushHistory = useCallback(
    (nextSettings: AppSettings, nextSeed: number) => {
      setHistory((prev) => {
        const trimmed = historyIndex >= 0 ? prev.slice(0, historyIndex + 1) : prev;
        return [...trimmed, { settings: nextSettings, seed: nextSeed }];
      });
      setHistoryIndex((i) => i + 1);
    },
    [historyIndex],
  );

  const applyTable = useCallback(
    (nextSettings: AppSettings, nextSeed: number, recordHistory = true) => {
      const next = buildTable(nextSettings, nextSeed);
      setSettings(nextSettings);
      setSeed(nextSeed);
      setTable(next);
      if (recordHistory) pushHistory(nextSettings, nextSeed);
    },
    [pushHistory],
  );

  const handleSelect = useCallback(
    (result: CombinationResult | null) => {
      stop();
      setSelected(result);
      if (result) void play(result);
    },
    [play, stop],
  );

  const handleQualityChange = (leftQuality: LeftQuality) => {
    stop();
    const nextSeed = generateSeed();
    applyTable({ ...settings, leftQuality }, nextSeed);
    setSelected(null);
  };

  const handleFilterChange = (stabilityFilter: StabilityFilter) => {
    stop();
    const nextSeed = generateSeed();
    applyTable({ ...settings, stabilityFilter }, nextSeed);
    setSelected(null);
  };

  const handleNotationChange = (notation: AppSettings['notation']) => {
    applyTable({ ...settings, notation }, seed, false);
  };

  const handleLockChange = (lockLeftType: boolean) => {
    setSettings((s) => ({ ...s, lockLeftType }));
  };

  const handleSeedApply = (nextSeed: number) => {
    stop();
    applyTable(settings, nextSeed);
    setSelected(null);
  };

  const handleRandom = () => {
    stop();
    const nextSeed = generateSeed();
    const leftQualities: LeftQuality[] = ['7', 'm7', 'Maj7', 'm7b5'];
    let nextSettings = settings;
    if (!settings.lockLeftType) {
      const idx = Math.floor(Math.random() * leftQualities.length);
      nextSettings = { ...settings, leftQuality: leftQualities[idx] };
    }
    applyTable(nextSettings, nextSeed);
    setSelected(null);
  };

  const handleHistoryBack = () => {
    stop();
    if (historyIndex < 0) return;
    const entry = history[historyIndex];
    if (!entry) return;
    const prev = history[historyIndex - 1];
    setHistoryIndex((i) => i - 1);
    if (prev) {
      setSettings(prev.settings);
      setSeed(prev.seed);
      setTable(buildTable(prev.settings, prev.seed));
    }
    setSelected(null);
  };

  const handleHistoryForward = () => {
    stop();
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    if (!next) return;
    setHistoryIndex((i) => i + 1);
    setSettings(next.settings);
    setSeed(next.seed);
    setTable(buildTable(next.settings, next.seed));
    setSelected(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>アッパーストラクチャー・コード組み合わせ</h1>
        <p className="subtitle">左手コードと右手トライアドの「理由を説明できる」組み合わせ生成</p>
      </header>

      <ControlPanel
        settings={settings}
        seed={seed}
        onQualityChange={handleQualityChange}
        onFilterChange={handleFilterChange}
        onNotationChange={handleNotationChange}
        onLockChange={handleLockChange}
        onRandom={handleRandom}
        onSeedApply={handleSeedApply}
        onHistoryBack={handleHistoryBack}
        onHistoryForward={handleHistoryForward}
        canGoBack={historyIndex >= 0}
        canGoForward={historyIndex < history.length - 1}
      />

      <SoundFontPanel sound={sound} onChange={setSound} />

      <main className="main-layout">
        <DetailPanel
          result={selected}
          notation={settings.notation}
          activeNoteIds={activeNoteIds}
          phase={phase}
          isPlaying={isPlaying}
          currentTime={currentTime}
          rollEvents={rollEvents}
          onStop={stop}
          onPlay={selected ? () => void play(selected) : undefined}
          onNoteClick={(note) => void playNote(note)}
        />
        <ChordTable
          table={table}
          settings={settings}
          selected={selected}
          triadHeaders={TRIAD_HEADERS}
          onSelect={handleSelect}
        />
      </main>
    </div>
  );
}

export { TRIAD_HEADERS };

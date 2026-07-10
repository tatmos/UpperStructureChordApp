import { useEffect, useState } from 'react';
import {
  GM_INSTRUMENT_NAMES,
  gmInstrumentOptionLabel,
  type SoundSettings,
} from '../audio/gmInstruments';
import {
  ensureSoundFontPlayer,
  getSoundFontError,
  getSoundFontLoadState,
  subscribeSoundFontLoadState,
  type SoundFontLoadState,
} from '../audio/soundFontEngine';

interface Props {
  sound: SoundSettings;
  onChange: (sound: SoundSettings) => void;
}

function loadStateLabel(state: SoundFontLoadState, error: string | null): string {
  switch (state) {
    case 'idle': return 'SGM Plus — 初回再生時に読み込み';
    case 'loading': return 'SGM Plus 読み込み中…';
    case 'ready': return 'SGM Plus (GM) 準備完了';
    case 'error': return `読み込み失敗: ${error ?? '不明'}`;
  }
}

export function SoundFontPanel({ sound, onChange }: Props) {
  const [loadState, setLoadState] = useState(getSoundFontLoadState());
  const [loadError, setLoadError] = useState(getSoundFontError());

  useEffect(() => subscribeSoundFontLoadState(setLoadState), []);

  const handlePreload = () => {
    ensureSoundFontPlayer()
      .then(() => setLoadError(null))
      .catch(() => setLoadError(getSoundFontError()));
  };

  return (
    <section className="soundfont-panel" aria-label="音色設定">
      <div className="soundfont-header">
        <span className="soundfont-title">音色 — SGM Plus (GM)</span>
        <span className={`soundfont-status status-${loadState}`}>
          {loadStateLabel(loadState, loadError)}
        </span>
        {loadState !== 'ready' && loadState !== 'loading' && (
          <button type="button" className="btn-small" onClick={handlePreload}>
            音源を読み込む
          </button>
        )}
      </div>
      <div className="soundfont-selects">
        <label>
          左手 GM
          <select
            value={sound.leftProgram}
            onChange={(e) => onChange({ ...sound, leftProgram: Number(e.target.value) })}
          >
            {GM_INSTRUMENT_NAMES.map((_, i) => (
              <option key={i} value={i}>{gmInstrumentOptionLabel(i)}</option>
            ))}
          </select>
        </label>
        <label>
          右手 GM
          <select
            value={sound.rightProgram}
            onChange={(e) => onChange({ ...sound, rightProgram: Number(e.target.value) })}
          >
            {GM_INSTRUMENT_NAMES.map((_, i) => (
              <option key={i} value={i}>{gmInstrumentOptionLabel(i)}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

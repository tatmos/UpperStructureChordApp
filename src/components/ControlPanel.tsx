import { useEffect, useState } from 'react';
import { parseSeed, type AppSettings, type LeftQuality, type StabilityFilter } from '../engine';

interface Props {
  settings: AppSettings;
  seed: number;
  onQualityChange: (q: LeftQuality) => void;
  onFilterChange: (f: StabilityFilter) => void;
  onNotationChange: (n: AppSettings['notation']) => void;
  onLockChange: (lock: boolean) => void;
  onRandom: () => void;
  onSeedApply: (seed: number) => void;
  onHistoryBack: () => void;
  onHistoryForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
}

const LEFT_OPTIONS: { value: LeftQuality; label: string }[] = [
  { value: '7', label: '7' },
  { value: 'm7', label: 'm7' },
  { value: 'Maj7', label: 'Maj7' },
  { value: 'm7b5', label: 'm7♭5' },
  { value: 'quartal', label: '4度重ね' },
  { value: 'quintal', label: '5度重ね' },
];

export function ControlPanel({
  settings,
  seed,
  onQualityChange,
  onFilterChange,
  onNotationChange,
  onLockChange,
  onRandom,
  onSeedApply,
  onHistoryBack,
  onHistoryForward,
  canGoBack,
  canGoForward,
}: Props) {
  const [draft, setDraft] = useState(String(seed));
  const [seedError, setSeedError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(seed));
    setSeedError(null);
  }, [seed]);

  const applyDraft = (text = draft) => {
    const parsed = parseSeed(text);
    if (parsed === null) {
      setSeedError('0〜4294967295 の整数');
      return;
    }
    setSeedError(null);
    setDraft(String(parsed));
    onSeedApply(parsed);
  };

  const copySeed = async () => {
    await navigator.clipboard.writeText(String(seed));
  };

  const pasteSeed = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDraft(text.trim());
      applyDraft(text);
    } catch {
      setSeedError('クリップボードを読み取れません');
    }
  };

  return (
    <section className="controls" aria-label="操作パネル">
      <div className="control-group">
        <label htmlFor="left-quality">左手コード</label>
        <select
          id="left-quality"
          value={settings.leftQuality}
          onChange={(e) => onQualityChange(e.target.value as LeftQuality)}
        >
          {LEFT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="control-group">
        <label htmlFor="stability">安定度</label>
        <select
          id="stability"
          value={settings.stabilityFilter}
          onChange={(e) => onFilterChange(e.target.value as StabilityFilter)}
        >
          <option value="recommended">推奨のみ</option>
          <option value="colorful">色彩的まで</option>
          <option value="all">高緊張を含む</option>
        </select>
      </div>

      <div className="control-group">
        <label>
          <input
            type="checkbox"
            checked={settings.lockLeftType}
            onChange={(e) => onLockChange(e.target.checked)}
          />
          左手タイプを固定
        </label>
      </div>

      <button type="button" className="btn-dice" onClick={onRandom} title="ランダム">
        🎲 ランダム
      </button>

      <div className="control-group history-btns">
        <button type="button" onClick={onHistoryBack} disabled={!canGoBack} title="戻る">←</button>
        <button type="button" onClick={onHistoryForward} disabled={!canGoForward} title="進む">→</button>
      </div>

      <div className="control-group seed-display">
        <label htmlFor="seed-input">シード</label>
        <input
          id="seed-input"
          className={`seed-input${seedError ? ' seed-input-error' : ''}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setSeedError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyDraft();
          }}
          aria-invalid={seedError ? true : undefined}
          aria-describedby={seedError ? 'seed-error' : undefined}
          title="0〜4294967295。Enter で適用"
        />
        <button type="button" onClick={() => applyDraft()} className="btn-small">適用</button>
        <button type="button" onClick={copySeed} className="btn-small">コピー</button>
        <button type="button" onClick={() => void pasteSeed()} className="btn-small">ペースト</button>
        {seedError && (
          <span id="seed-error" className="seed-error" role="alert">{seedError}</span>
        )}
      </div>

      <details className="notation-details">
        <summary>表記設定</summary>
        <div className="notation-options">
          <label>
            Maj7
            <select
              value={settings.notation.maj7}
              onChange={(e) => onNotationChange({ ...settings.notation, maj7: e.target.value as 'Maj7' | '△7' })}
            >
              <option value="Maj7">Maj7</option>
              <option value="△7">△7</option>
            </select>
          </label>
          <label>
            m7♭5
            <select
              value={settings.notation.m7b5}
              onChange={(e) => onNotationChange({ ...settings.notation, m7b5: e.target.value as 'm7♭5' | 'ø7' })}
            >
              <option value="m7♭5">m7♭5</option>
              <option value="ø7">ø7</option>
            </select>
          </label>
          <label>
            dim
            <select
              value={settings.notation.dim}
              onChange={(e) => onNotationChange({ ...settings.notation, dim: e.target.value as 'dim' | '°' })}
            >
              <option value="dim">dim</option>
              <option value="°">°</option>
            </select>
          </label>
          <label>
            aug
            <select
              value={settings.notation.aug}
              onChange={(e) => onNotationChange({ ...settings.notation, aug: e.target.value as 'aug' | '+' })}
            >
              <option value="aug">aug</option>
              <option value="+">+</option>
            </select>
          </label>
        </div>
      </details>
    </section>
  );
}

import { useMemo } from 'react';
import {
  buildPlaybackNotes,
  buildRollTimeline,
  getSortedByPitch,
  type PlaybackNote,
  type RollEvent,
} from '../audio/chordPlayback';
import { formatTriadSymbol, type CombinationResult, type NotationStyle } from '../engine';
import type { PlaybackPhase } from '../hooks/useChordPlayback';
import { PianoRoll } from './PianoRoll';

interface Props {
  result: CombinationResult | null;
  notation: NotationStyle;
  activeNoteIds: Set<string>;
  phase: PlaybackPhase;
  isPlaying: boolean;
  currentTime: number;
  rollEvents: RollEvent[];
  onStop?: () => void;
  onPlay?: () => void;
  onNoteClick?: (note: PlaybackNote) => void;
}

function phaseLabel(phase: PlaybackPhase): string {
  switch (phase) {
    case 'chord': return '和音（四分音符）';
    case 'arpeggio-up': return 'アルペジオ ↑（八分音符）';
    case 'arpeggio-down': return 'アルペジオ ↓（八分音符）';
    default: return '';
  }
}

export function DetailPanel({
  result,
  notation,
  activeNoteIds,
  phase,
  isPlaying,
  currentTime,
  rollEvents,
  onStop,
  onPlay,
  onNoteClick,
}: Props) {
  const previewEvents = useMemo(
    () => (result ? buildRollTimeline(result) : []),
    [result],
  );
  const events = rollEvents.length > 0 ? rollEvents : previewEvents;

  if (!result) {
    return (
      <section className="detail-panel empty-detail" aria-label="詳細説明">
        <h2>詳細説明</h2>
        <p>表のセルをクリックすると、ピアノロール・構成音の再生と説明が表示されます。</p>
      </section>
    );
  }

  const { detail, upperTriad, score } = result;
  const theoretical =
    upperTriad.readableTones && upperTriad.tones.join('–') !== (upperTriad.readableTones?.join('–') ?? '')
      ? upperTriad.tones.join('–')
      : null;

  const playbackNotes = buildPlaybackNotes(result);
  const sortedNotes = getSortedByPitch(playbackNotes);

  const gridItems = [
    { label: '左手コード', value: detail.leftChordDisplay },
    {
      label: '右手コード',
      value: (
        <>
          {formatTriadSymbol(upperTriad, notation)} = {(upperTriad.readableTones ?? upperTriad.tones).join('–')}
          {theoretical && <span className="theoretical">（理論綴り: {theoretical}）</span>}
        </>
      ),
    },
    { label: '度数', value: detail.degreeLine },
    { label: '追加テンション', value: detail.addedTensions },
    { label: '想定される響き', value: detail.impliedSound },
    { label: '評価', value: `${detail.evaluation}（スコア: ${score}）` },
    { label: '選定理由', value: detail.selectionReason, wide: true },
    { label: '注意点', value: detail.caution, wide: true },
  ];

  return (
    <section className="detail-panel" aria-label="詳細説明">
      <div className="detail-header">
        <h2>詳細説明</h2>
        {(onPlay || onStop) && (
          <div className="playback-status">
            {isPlaying ? (
              <>
                <span className="playback-indicator" aria-hidden="true" />
                <span>{phaseLabel(phase)}</span>
                {onStop && (
                  <button type="button" className="btn-small btn-stop" onClick={onStop}>
                    停止
                  </button>
                )}
              </>
            ) : (
              onPlay && (
                <button type="button" className="btn-small btn-play" onClick={onPlay}>
                  再生
                </button>
              )
            )}
          </div>
        )}
      </div>

      <PianoRoll events={events} currentTime={currentTime} isPlaying={isPlaying} />

      <div className="detail-grid">
        {gridItems.map((item) => (
          <div key={item.label} className={`detail-grid-item${item.wide ? ' wide' : ''}`}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </div>

      <section className="note-playback-list" aria-label="構成音一覧">
        <h3>構成音</h3>
        <ul className="note-chips">
          {sortedNotes.map((note) => {
            const isActive = activeNoteIds.has(note.id);
            return (
              <li key={note.id}>
                <button
                  type="button"
                  className={`note-chip source-${note.source}${isActive ? ' active' : ''}`}
                  aria-pressed={isActive}
                  aria-label={`${note.name} を再生（${note.source === 'left' ? '左手' : '右手'}${note.degree ? ` · ${note.degree}` : ''}）`}
                  onClick={() => onNoteClick?.(note)}
                >
                  <span className="note-chip-name">{note.name}</span>
                  <span className="note-chip-meta">
                    {note.source === 'left' ? '左手' : '右手'}
                    {note.degree ? ` · ${note.degree}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}

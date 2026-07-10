import { useMemo } from 'react';
import {
  getTimelineDuration,
  midiToLabel,
  PIANO_ROLL_PPS,
  PIANO_ROLL_ROW_HEIGHT,
  type RollEvent,
} from '../audio/chordPlayback';

interface Props {
  events: RollEvent[];
  currentTime: number;
  isPlaying: boolean;
}

function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

export function PianoRoll({ events, currentTime, isPlaying }: Props) {
  const { maxPitch, width, height, pitchRows } = useMemo(() => {
    if (events.length === 0) {
      return { minPitch: 48, maxPitch: 72, width: 400, height: 200, pitchRows: [] as number[] };
    }
    const pitches = events.map((e) => e.pitch);
    const min = Math.min(...pitches) - 2;
    const max = Math.max(...pitches) + 2;
    const rows: number[] = [];
    for (let p = max; p >= min; p--) rows.push(p);
    const dur = getTimelineDuration(events);
    return {
      minPitch: min,
      maxPitch: max,
      width: Math.max(320, dur * PIANO_ROLL_PPS + 48),
      height: rows.length * PIANO_ROLL_ROW_HEIGHT + 24,
      pitchRows: rows,
    };
  }, [events]);

  const labelWidth = 36;

  if (events.length === 0) {
    return (
      <div className="piano-roll empty">
        <p>セルを選択するとピアノロールが表示されます</p>
      </div>
    );
  }

  const yForPitch = (pitch: number) => 12 + (maxPitch - pitch) * PIANO_ROLL_ROW_HEIGHT;

  return (
    <div className="piano-roll">
      <div className="piano-roll-scroll">
        <svg
          className="piano-roll-svg"
          width={width + labelWidth}
          height={height}
          role="img"
          aria-label="ピアノロール"
        >
          {pitchRows.map((pitch) => {
            const y = yForPitch(pitch);
            const black = isBlackKey(pitch);
            const showLabel = pitch % 12 === 0;
            return (
              <g key={pitch}>
                <rect
                  x={labelWidth}
                  y={y}
                  width={width}
                  height={PIANO_ROLL_ROW_HEIGHT}
                  className={`roll-row${black ? ' black-key' : ''}`}
                />
                <text x={4} y={y + PIANO_ROLL_ROW_HEIGHT - 1.5} className="roll-pitch-label">
                  {showLabel ? midiToLabel(pitch) : ''}
                </text>
              </g>
            );
          })}

          {events.map((ev) => {
            const x = labelWidth + ev.startTime * PIANO_ROLL_PPS;
            const w = Math.max(2, (ev.endTime - ev.startTime) * PIANO_ROLL_PPS - 1);
            const y = yForPitch(ev.pitch) + 1;
            const h = PIANO_ROLL_ROW_HEIGHT - 2;
            const active = currentTime >= ev.startTime && currentTime < ev.endTime;
            return (
              <rect
                key={ev.id}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={1}
                className={`roll-note source-${ev.source}${active ? ' active' : ''}`}
              >
                <title>{`${ev.name} (${ev.source === 'left' ? '左手' : '右手'})`}</title>
              </rect>
            );
          })}

          {isPlaying && (
            <line
              x1={labelWidth + currentTime * PIANO_ROLL_PPS}
              x2={labelWidth + currentTime * PIANO_ROLL_PPS}
              y1={8}
              y2={height - 8}
              className="roll-playhead"
            />
          )}
        </svg>
      </div>
      <div className="piano-roll-legend">
        <span className="legend-left">■ 左手</span>
        <span className="legend-right">■ 右手</span>
        <span className="legend-phase">縦線 = 再生位置</span>
      </div>
    </div>
  );
}

import {
  formatLeftSymbol,
  formatTriadSymbol,
  TRIAD_QUALITIES,
  type AppSettings,
  type CombinationResult,
  type TableState,
  type TriadQuality,
} from '../engine';

interface Props {
  table: TableState;
  settings: AppSettings;
  selected: CombinationResult | null;
  triadHeaders: Record<TriadQuality, string>;
  onSelect: (result: CombinationResult | null) => void;
}

function labelText(label: CombinationResult['label']): string {
  switch (label) {
    case 'recommended': return '推奨';
    case 'colorful': return '色彩的';
    case 'high-tension': return '高緊張';
  }
}

function labelClass(label: CombinationResult['label']): string {
  return `label-${label}`;
}

export function ChordTable({ table, settings, selected, triadHeaders, onSelect }: Props) {
  return (
    <div className="table-wrapper">
      <table className="chord-table">
        <thead>
          <tr>
            <th scope="col">左手</th>
            {TRIAD_QUALITIES.map((q) => (
              <th key={q} scope="col">{triadHeaders[q]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.leftRoot}>
              <th scope="row" className="left-cell">
                {formatLeftSymbol(row.leftChord, settings.notation)}
              </th>
              {TRIAD_QUALITIES.map((quality) => {
                const cell = row.cells[quality];
                const result = cell.result;
                const isSelected =
                  selected?.leftChord.root === row.leftRoot &&
                  selected?.upperTriad.quality === quality &&
                  selected?.upperTriad.root === result?.upperTriad.root;

                if (!result) {
                  return (
                    <td key={quality} className="cell empty">
                      <span className="empty-label">該当なし</span>
                    </td>
                  );
                }

                return (
                  <td key={quality} className="cell">
                    <button
                      type="button"
                      className={`cell-btn ${labelClass(result.label)}${isSelected ? ' selected' : ''}`}
                      onClick={() => onSelect(result)}
                      aria-pressed={isSelected}
                      title={result.shortExplanation}
                    >
                      <span className="chord-name">
                        {formatTriadSymbol(result.upperTriad, settings.notation)}
                      </span>
                      <span className={`status-label ${labelClass(result.label)}`}>
                        {labelText(result.label)}
                      </span>
                      <span className="short-exp">{result.shortExplanation}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

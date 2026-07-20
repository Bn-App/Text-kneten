import type { TatteInfo } from '../../model/document';

interface TattePanelProps {
  tatte: TatteInfo;
  onChange: (tatte: TatteInfo) => void;
}

const FIELDS: { key: keyof TatteInfo; label: string }[] = [
  { key: 'titel', label: 'T — Titel' },
  { key: 'autor', label: 'A — Autor' },
  { key: 'textsorte', label: 'T — Textsorte' },
  { key: 'thema', label: 'T — Thema' },
  { key: 'entstehungszeit', label: 'E — Entstehungszeit / Erscheinungsjahr' },
];

export function TattePanel({ tatte, onChange }: TattePanelProps) {
  return (
    <div className="tatte-fields">
      {FIELDS.map((field) => (
        <label key={field.key} className="panel-field">
          <span className="panel-field-label">{field.label}</span>
          <input
            type="text"
            value={tatte[field.key]}
            onChange={(e) => onChange({ ...tatte, [field.key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}

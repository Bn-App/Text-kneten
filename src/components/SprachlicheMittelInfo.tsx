import { useState } from 'react';
import { SPRACHLICHE_MITTEL } from '../lib/sprache/sprachlicheMittelData';

export function SprachlicheMittelInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm-info">
      <button className="btn" onClick={() => setOpen((o) => !o)}>
        📖 Sprachliche Mittel {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="sm-info-panel">
          <table className="sm-info-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Bezeichnung</th>
                <th>Erklärung</th>
                <th>Beispiel</th>
              </tr>
            </thead>
            <tbody>
              {SPRACHLICHE_MITTEL.map((m, i) => (
                <tr key={m.id}>
                  <td>{i + 1}</td>
                  <td>{m.begriff}</td>
                  <td>{m.erklaerung}</td>
                  <td className="sm-info-example">{m.beispiel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

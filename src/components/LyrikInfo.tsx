import { useState } from 'react';
import { LYRIK_SECTIONS } from '../lib/sprache/lyrikData';

export function LyrikInfo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm-info">
      <button className="btn" onClick={() => setOpen((o) => !o)}>
        📚 Lyrik {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="sm-info-panel">
          {LYRIK_SECTIONS.map((section) => (
            <div key={section.id} className="lyrik-section">
              <h4>{section.heading}</h4>
              {section.intro && <p>{section.intro}</p>}
              {section.table && (
                <table className="sm-info-table">
                  <thead>
                    <tr>
                      <th>{section.table.columns[0]}</th>
                      <th>{section.table.columns[1]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row) => (
                      <tr key={row.begriff}>
                        <td>{row.begriff}</td>
                        <td>{row.erklaerung}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

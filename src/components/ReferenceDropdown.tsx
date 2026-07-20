import { useState } from 'react';
import type { ReferenceSection } from '../lib/reference/types';

interface ReferenceDropdownProps {
  icon: string;
  label: string;
  sections: ReferenceSection[];
}

export function ReferenceDropdown({ icon, label, sections }: ReferenceDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm-info">
      <button className="btn" onClick={() => setOpen((o) => !o)}>
        {icon} {label} {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="sm-info-panel">
          {sections.map((section) => (
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

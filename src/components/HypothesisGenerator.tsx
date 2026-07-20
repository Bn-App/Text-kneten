import { useState } from 'react';
import { GENERATOR_COLUMNS, GENERATOR_ROW_1, GENERATOR_ROW_2 } from '../lib/hypothesis/generatorData';

interface HypothesisGeneratorProps {
  onInsert: (text: string) => void;
}

export function HypothesisGenerator({ onInsert }: HypothesisGeneratorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="hyp-generator">
      <button className="btn" onClick={() => setOpen((o) => !o)}>
        🧩 Hypothesen-Generator {open ? '▴' : '▾'}
      </button>

      {open && (
        <div className="hyp-generator-panel">
          <p className="hyp-generator-hint">
            Klicke Textbausteine an, um sie in deine Hypothese einzufügen — danach frei weiterbearbeiten.
          </p>
          <div className="hyp-generator-table">
            <div className="hyp-generator-row">
              {GENERATOR_COLUMNS.map((col) => (
                <div key={col.id} className="hyp-generator-col">
                  <div className="hyp-generator-col-header">{col.header}</div>
                  <div className="hyp-generator-items">
                    {GENERATOR_ROW_1[col.id]?.map((item) => (
                      <button key={item} className="hyp-generator-item" onClick={() => onInsert(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="hyp-generator-row second">
              {GENERATOR_COLUMNS.map((col) => (
                <div key={col.id} className="hyp-generator-col">
                  <div className="hyp-generator-items">
                    {GENERATOR_ROW_2[col.id]?.map((item) => (
                      <button key={item} className="hyp-generator-item" onClick={() => onInsert(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

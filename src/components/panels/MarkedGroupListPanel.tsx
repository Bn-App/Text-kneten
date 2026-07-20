import { useState } from 'react';
import type { Line, Mark } from '../../model/document';
import type { MarkTool } from '../MarkableText';
import { excerptsForItem } from '../../lib/marks/excerpts';

interface MarkedGroupItem {
  id: string;
  order: number;
  title: string;
  summary: string;
}

interface MarkedGroupListPanelProps {
  heading: string;
  items: MarkedGroupItem[];
  itemNounSingular: string;
  titleFieldLabel: string;
  summaryFieldLabel: string;
  summaryPlaceholder: string;
  emptyHint: string;
  tool: MarkTool;
  marks: Mark[];
  lines: Line[];
  onRename: (id: string, title: string) => void;
  onUpdateSummary: (id: string, summary: string) => void;
}

const COLLAPSE_THRESHOLD = 3;

export function MarkedGroupListPanel({
  heading,
  items,
  itemNounSingular,
  titleFieldLabel,
  summaryFieldLabel,
  summaryPlaceholder,
  emptyHint,
  tool,
  marks,
  lines,
  onRename,
  onUpdateSummary,
}: MarkedGroupListPanelProps) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="panel-box">
      <h3>{heading}</h3>
      {sorted.length === 0 ? (
        <p className="text-muted">{emptyHint}</p>
      ) : (
        <div className="sinnabschnitt-list">
          {sorted.map((item) => {
            const excerpts = excerptsForItem(item.id, tool, marks, lines);
            const isExpanded = expandedIds.has(item.id);
            const visibleExcerpts = isExpanded ? excerpts : excerpts.slice(0, COLLAPSE_THRESHOLD);
            return (
              <div key={item.id} className="sinnabschnitt-item">
                <label className="panel-field">
                  <span className="panel-field-label">
                    {titleFieldLabel} {itemNounSingular} {item.order + 1}
                  </span>
                  <input
                    type="text"
                    value={item.title}
                    placeholder={`${itemNounSingular} ${item.order + 1}`}
                    onChange={(e) => onRename(item.id, e.target.value)}
                  />
                </label>

                {excerpts.length > 0 && (
                  <div className="panel-field">
                    <span className="panel-field-label">Markierte Textstellen</span>
                    <div className="marked-excerpts">
                      {visibleExcerpts.map((text, i) => (
                        <div key={i} className="marked-excerpt-line">
                          „{text}“
                        </div>
                      ))}
                    </div>
                    {excerpts.length > COLLAPSE_THRESHOLD && (
                      <button className="marked-excerpts-toggle" onClick={() => toggleExpanded(item.id)}>
                        {isExpanded ? '▴ Weniger anzeigen' : `▾ Alle ${excerpts.length} anzeigen`}
                      </button>
                    )}
                  </div>
                )}

                <label className="panel-field">
                  <span className="panel-field-label">{summaryFieldLabel}</span>
                  <textarea
                    className="panel-textarea"
                    rows={3}
                    value={item.summary}
                    placeholder={summaryPlaceholder}
                    onChange={(e) => onUpdateSummary(item.id, e.target.value)}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

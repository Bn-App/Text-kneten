import { useState } from 'react';
import type { Line, Mark } from '../../model/document';
import type { MarkTool } from '../MarkableText';
import { excerptsForItem } from '../../lib/marks/excerpts';
import { useRowWidth } from '../../lib/text/lineNumbers';
import { ConfirmDialog } from '../ConfirmDialog';

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
  onDelete: (id: string) => void;
}

const COLLAPSE_THRESHOLD = 3;

function itemDisplayTitle(item: MarkedGroupItem, itemNounSingular: string): string {
  return item.title.trim() || `${itemNounSingular} ${item.order + 1}`;
}

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
  onDelete,
}: MarkedGroupListPanelProps) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  const rowWidth = useRowWidth();
  const [expandedExcerptIds, setExpandedExcerptIds] = useState<Set<string>>(new Set());
  const [collapsedItemIds, setCollapsedItemIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<MarkedGroupItem | null>(null);

  function toggleExcerptsExpanded(id: string) {
    setExpandedExcerptIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleItemCollapsed(id: string) {
    setCollapsedItemIds((prev) => {
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
            const isCollapsed = collapsedItemIds.has(item.id);
            const excerpts = excerptsForItem(item.id, tool, marks, lines, rowWidth);
            const isExcerptsExpanded = expandedExcerptIds.has(item.id);
            const visibleExcerpts = isExcerptsExpanded ? excerpts : excerpts.slice(0, COLLAPSE_THRESHOLD);

            return (
              <div key={item.id} className="sinnabschnitt-item">
                <div className="sinnabschnitt-item-header-row">
                  <button
                    className="sinnabschnitt-item-header"
                    onClick={() => toggleItemCollapsed(item.id)}
                    title={isCollapsed ? 'Ausklappen' : 'Einklappen'}
                  >
                    <span className={`sinnabschnitt-item-arrow${isCollapsed ? '' : ' open'}`}>›</span>
                    <span className="sinnabschnitt-item-title">
                      {item.order + 1}. {itemDisplayTitle(item, itemNounSingular)}
                    </span>
                  </button>
                  <button
                    className="sinnabschnitt-item-delete"
                    onClick={() => setPendingDelete(item)}
                    title="Löschen"
                  >
                    🗑
                  </button>
                </div>

                {!isCollapsed && (
                  <>
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
                          {visibleExcerpts.map((excerpt, i) => (
                            <div key={i} className="marked-excerpt-line">
                              <span className="marked-excerpt-text">„{excerpt.text}“</span>
                              {excerpt.lineRef && <span className="marked-excerpt-ref">({excerpt.lineRef})</span>}
                            </div>
                          ))}
                        </div>
                        {excerpts.length > COLLAPSE_THRESHOLD && (
                          <button className="marked-excerpts-toggle" onClick={() => toggleExcerptsExpanded(item.id)}>
                            {isExcerptsExpanded ? '▴ Weniger anzeigen' : `▾ Alle ${excerpts.length} anzeigen`}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`${itemNounSingular} löschen?`}
        message={`„${pendingDelete ? itemDisplayTitle(pendingDelete, itemNounSingular) : ''}“ wird gelöscht. Die zugehörigen Markierungen verschwinden dabei auch im Text — sofern sie nicht noch einer anderen Kategorie zugeordnet sind.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

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
  onRename: (id: string, title: string) => void;
  onUpdateSummary: (id: string, summary: string) => void;
}

export function MarkedGroupListPanel({
  heading,
  items,
  itemNounSingular,
  titleFieldLabel,
  summaryFieldLabel,
  summaryPlaceholder,
  emptyHint,
  onRename,
  onUpdateSummary,
}: MarkedGroupListPanelProps) {
  const sorted = [...items].sort((a, b) => a.order - b.order);

  return (
    <div className="panel-box">
      <h3>{heading}</h3>
      {sorted.length === 0 ? (
        <p className="text-muted">{emptyHint}</p>
      ) : (
        <div className="sinnabschnitt-list">
          {sorted.map((item) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

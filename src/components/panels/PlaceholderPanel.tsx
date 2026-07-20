interface PlaceholderPanelProps {
  title: string;
}

export function PlaceholderPanel({ title }: PlaceholderPanelProps) {
  return (
    <div className="panel-box">
      <h3>{title}</h3>
      <p className="text-muted">Dieser Bereich wird später ergänzt.</p>
    </div>
  );
}

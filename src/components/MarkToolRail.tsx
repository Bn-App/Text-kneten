export type MarkTool = 'wortfeld' | 'sinnabschnitt';

interface MarkToolRailProps {
  pinned: MarkTool | null;
  onHoverStart: (tool: MarkTool) => void;
  onHoverEnd: () => void;
  onTogglePin: (tool: MarkTool) => void;
}

// One entry per analysis tool that produces marks in the text. Extend here
// as further marking-based tools ship.
const RAIL_ITEMS: { id: MarkTool; icon: string; label: string }[] = [
  { id: 'wortfeld', icon: '🔤', label: 'Wortfelder' },
  { id: 'sinnabschnitt', icon: '📑', label: 'Sinnabschnitte' },
];

export function MarkToolRail({ pinned, onHoverStart, onHoverEnd, onTogglePin }: MarkToolRailProps) {
  return (
    <div className="mark-tool-rail">
      {RAIL_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`mark-tool-rail-btn${pinned === item.id ? ' active' : ''}`}
          title={`${item.label} im Text hervorheben`}
          onMouseEnter={() => onHoverStart(item.id)}
          onMouseLeave={onHoverEnd}
          onClick={() => onTogglePin(item.id)}
        >
          <span className="mark-tool-rail-icon">{item.icon}</span>
          <span className="mark-tool-rail-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

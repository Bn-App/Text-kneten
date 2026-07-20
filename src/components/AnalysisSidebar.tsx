import { useState } from 'react';
import type { TatteInfo, TextDocument } from '../model/document';
import { TattePanel } from './panels/TattePanel';

export type NavTabId = 'hypothese' | 'inhalt' | 'formal' | 'sprache';

interface NamedGroupItem {
  id: string;
  order: number;
  title: string;
}

interface AnalysisSidebarProps {
  doc: TextDocument;
  activeView: string;
  onNavigateToTab: (id: NavTabId) => void;
  tatteExpanded: boolean;
  onToggleTatte: () => void;
  onTatteChange: (tatte: TatteInfo) => void;
  sprachDropdownOpen: boolean;
  onToggleSprachDropdown: () => void;
  onStartWortfeldAssign: () => void;
  highlightedWortfeld: string | 'none' | null;
  onHighlightWortfeld: (value: string | 'none' | null) => void;
  inhaltDropdownOpen: boolean;
  onToggleInhaltDropdown: () => void;
  highlightedSinnabschnitt: string | null;
  onHighlightSinnabschnitt: (id: string | null) => void;
  onRenameSinnabschnitt: (id: string, title: string) => void;
  highlightedSprachmittel: string | null;
  onHighlightSprachmittel: (id: string | null) => void;
  onRenameSprachmittel: (id: string, title: string) => void;
}

const NAV_ROWS: { id: NavTabId; label: string }[] = [
  { id: 'hypothese', label: 'Hypothese' },
  { id: 'formal', label: 'Formale Aspekte' },
];

function namedGroupLabel(item: NamedGroupItem, fallbackPrefix: string): string {
  return item.title.trim() || `${fallbackPrefix} ${item.order + 1}`;
}

export function AnalysisSidebar({
  doc,
  activeView,
  onNavigateToTab,
  tatteExpanded,
  onToggleTatte,
  onTatteChange,
  sprachDropdownOpen,
  onToggleSprachDropdown,
  onStartWortfeldAssign,
  highlightedWortfeld,
  onHighlightWortfeld,
  inhaltDropdownOpen,
  onToggleInhaltDropdown,
  highlightedSinnabschnitt,
  onHighlightSinnabschnitt,
  onRenameSinnabschnitt,
  highlightedSprachmittel,
  onHighlightSprachmittel,
  onRenameSprachmittel,
}: AnalysisSidebarProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const wortfeldGroups = Array.from(
    new Set(doc.marks.map((m) => m.labels.wortfeld).filter((v): v is string => !!v)),
  ).sort((a, b) => a.localeCompare(b));
  const hasAnyMarks = doc.marks.length > 0;
  const sinnabschnitte = [...doc.sinnabschnitte].sort((a, b) => a.order - b.order);
  const sprachmittel = [...doc.sprachmittel].sort((a, b) => a.order - b.order);

  function startEditing(key: string, currentTitle: string) {
    setEditingKey(key);
    setEditingValue(currentTitle);
  }

  function commitEditing(onRename: (id: string, title: string) => void, id: string) {
    onRename(id, editingValue.trim());
    setEditingKey(null);
  }

  function renderNamedGroupList<T extends NamedGroupItem>(
    items: T[],
    keyPrefix: string,
    fallbackPrefix: string,
    highlightedId: string | null,
    onHighlight: (id: string | null) => void,
    onRename: (id: string, title: string) => void,
  ) {
    return items.map((item) => {
      const editKey = `${keyPrefix}-${item.id}`;
      if (editingKey === editKey) {
        return (
          <input
            key={item.id}
            autoFocus
            className="sidebar-dropdown-rename-input"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => commitEditing(onRename, item.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEditing(onRename, item.id);
              if (e.key === 'Escape') setEditingKey(null);
            }}
          />
        );
      }
      return (
        <div key={item.id} className="sidebar-dropdown-item-row">
          <button
            className={`sidebar-dropdown-item sub${highlightedId === item.id ? ' active' : ''}`}
            onClick={() => onHighlight(highlightedId === item.id ? null : item.id)}
          >
            {namedGroupLabel(item, fallbackPrefix)}
          </button>
          <button
            className="sidebar-dropdown-edit"
            title="Umbenennen"
            onClick={() => startEditing(editKey, item.title)}
          >
            ✎
          </button>
        </div>
      );
    });
  }

  return (
    <aside className="analysis-sidebar">
      <div className="sidebar-row-group">
        <div className="sidebar-row">
          <button className="sidebar-row-label" onClick={onToggleTatte}>
            Basisinformationen (TATTE)
          </button>
          <button
            className={`sidebar-row-arrow${tatteExpanded ? ' open' : ''}`}
            onClick={onToggleTatte}
            title="Ausklappen"
          >
            ›
          </button>
        </div>
        {tatteExpanded && (
          <div className="sidebar-dropdown sidebar-dropdown-fields">
            <TattePanel tatte={doc.tatte} onChange={onTatteChange} />
          </div>
        )}
      </div>

      <div className="sidebar-row-group">
        <div className={`sidebar-row${activeView === 'hypothese' ? ' active' : ''}`}>
          <button className="sidebar-row-label" onClick={() => onNavigateToTab('hypothese')}>
            Hypothese
          </button>
        </div>
      </div>

      <div className="sidebar-row-group">
        <div className={`sidebar-row${activeView === 'inhalt' ? ' active' : ''}`}>
          <button className="sidebar-row-label" onClick={() => onNavigateToTab('inhalt')}>
            Inhalt/Aufbau
          </button>
          <button
            className={`sidebar-row-arrow${inhaltDropdownOpen ? ' open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleInhaltDropdown();
            }}
            title="Sinnabschnitte"
          >
            ›
          </button>
        </div>

        {inhaltDropdownOpen && (
          <div className="sidebar-dropdown">
            <div className="sidebar-dropdown-group">
              <div className="sidebar-dropdown-header">Sinnabschnitte</div>
              {sinnabschnitte.length === 0 && (
                <p className="sidebar-dropdown-empty">Noch keine Sinnabschnitte markiert.</p>
              )}
              <div className="sidebar-dropdown-sub">
                {renderNamedGroupList(
                  sinnabschnitte,
                  'sinnabschnitt',
                  'Abschnitt',
                  highlightedSinnabschnitt,
                  onHighlightSinnabschnitt,
                  onRenameSinnabschnitt,
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {NAV_ROWS.map((row) => (
        <div key={row.id} className="sidebar-row-group">
          <div className={`sidebar-row${activeView === row.id ? ' active' : ''}`}>
            <button className="sidebar-row-label" onClick={() => onNavigateToTab(row.id)}>
              {row.label}
            </button>
          </div>
        </div>
      ))}

      <div className="sidebar-row-group">
        <div className={`sidebar-row${activeView === 'sprache' ? ' active' : ''}`}>
          <button className="sidebar-row-label" onClick={() => onNavigateToTab('sprache')}>
            Sprache/Stil
          </button>
          <button
            className={`sidebar-row-arrow${sprachDropdownOpen ? ' open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSprachDropdown();
            }}
            title="Werkzeuge"
          >
            ›
          </button>
        </div>

        {sprachDropdownOpen && (
          <div className="sidebar-dropdown">
            <div className="sidebar-dropdown-group">
              <button className="sidebar-dropdown-item" onClick={onStartWortfeldAssign}>
                Wortfelder
              </button>
              {wortfeldGroups.length > 0 && (
                <div className="sidebar-dropdown-sub">
                  {wortfeldGroups.map((name) => (
                    <button
                      key={name}
                      className={`sidebar-dropdown-item sub${highlightedWortfeld === name ? ' active' : ''}`}
                      onClick={() => onHighlightWortfeld(highlightedWortfeld === name ? null : name)}
                    >
                      {name}
                    </button>
                  ))}
                  {hasAnyMarks && (
                    <button
                      className={`sidebar-dropdown-item sub${highlightedWortfeld === 'none' ? ' active' : ''}`}
                      onClick={() => onHighlightWortfeld(highlightedWortfeld === 'none' ? null : 'none')}
                    >
                      keine Zuordnung
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-dropdown-group">
              <div className="sidebar-dropdown-header">Sprache</div>
              {sprachmittel.length === 0 && (
                <p className="sidebar-dropdown-empty">Noch keine Sprachmittel markiert.</p>
              )}
              <div className="sidebar-dropdown-sub">
                {renderNamedGroupList(
                  sprachmittel,
                  'sprache',
                  'Sprachmittel',
                  highlightedSprachmittel,
                  onHighlightSprachmittel,
                  onRenameSprachmittel,
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

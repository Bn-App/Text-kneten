import { useState } from 'react';
import type { Sinnabschnitt, TatteInfo, TextDocument } from '../model/document';
import { TattePanel } from './panels/TattePanel';

export type NavTabId = 'hypothese' | 'inhalt' | 'formal';

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
}

const NAV_ROWS: { id: NavTabId; label: string }[] = [
  { id: 'hypothese', label: 'Hypothese' },
  { id: 'formal', label: 'Formale Aspekte' },
];

function sinnabschnittLabel(s: Sinnabschnitt): string {
  return s.title.trim() || `Abschnitt ${s.order + 1}`;
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
}: AnalysisSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const wortfeldGroups = Array.from(
    new Set(doc.marks.map((m) => m.labels.wortfeld).filter((v): v is string => !!v)),
  ).sort((a, b) => a.localeCompare(b));
  const hasAnyMarks = doc.marks.length > 0;
  const sinnabschnitte = [...doc.sinnabschnitte].sort((a, b) => a.order - b.order);

  function startEditing(s: Sinnabschnitt) {
    setEditingId(s.id);
    setEditingValue(s.title);
  }

  function commitEditing() {
    if (editingId) onRenameSinnabschnitt(editingId, editingValue.trim());
    setEditingId(null);
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
                {sinnabschnitte.map((s) =>
                  editingId === s.id ? (
                    <input
                      key={s.id}
                      autoFocus
                      className="sidebar-dropdown-rename-input"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={commitEditing}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEditing();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    <div key={s.id} className="sidebar-dropdown-item-row">
                      <button
                        className={`sidebar-dropdown-item sub${highlightedSinnabschnitt === s.id ? ' active' : ''}`}
                        onClick={() => onHighlightSinnabschnitt(highlightedSinnabschnitt === s.id ? null : s.id)}
                      >
                        {sinnabschnittLabel(s)}
                      </button>
                      <button
                        className="sidebar-dropdown-edit"
                        title="Umbenennen"
                        onClick={() => startEditing(s)}
                      >
                        ✎
                      </button>
                    </div>
                  ),
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
        <div className="sidebar-row">
          <button className="sidebar-row-label" disabled>
            Sprache/Stil
          </button>
          <button
            className={`sidebar-row-arrow${sprachDropdownOpen ? ' open' : ''}`}
            onClick={onToggleSprachDropdown}
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
          </div>
        )}
      </div>
    </aside>
  );
}

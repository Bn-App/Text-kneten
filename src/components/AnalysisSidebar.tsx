import { useState } from 'react';
import type { NamedMarkGroup, TatteInfo, TextDocument } from '../model/document';
import type { MarkTool } from './MarkableText';
import { TattePanel } from './panels/TattePanel';

export type NavTabId = 'hypothese' | 'inhalt' | 'formal' | 'sprache';

interface AnalysisSidebarProps {
  doc: TextDocument;
  activeView: string;
  onNavigateToTab: (id: NavTabId) => void;
  tatteExpanded: boolean;
  onToggleTatte: () => void;
  onTatteChange: (tatte: TatteInfo) => void;
  sprachDropdownOpen: boolean;
  onToggleSprachDropdown: () => void;
  inhaltDropdownOpen: boolean;
  onToggleInhaltDropdown: () => void;
  formalDropdownOpen: boolean;
  onToggleFormalDropdown: () => void;
  highlightedGroup: { tool: MarkTool; id: string } | null;
  highlightedUnassigned: MarkTool | null;
  onHighlightGroup: (tool: MarkTool, id: string) => void;
  onHighlightUnassigned: (tool: MarkTool) => void;
  onRenameGroup: (tool: MarkTool, id: string, title: string) => void;
  onStartAssign: (tool: MarkTool) => void;
}

function namedGroupLabel(item: NamedMarkGroup, fallbackPrefix: string): string {
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
  inhaltDropdownOpen,
  onToggleInhaltDropdown,
  formalDropdownOpen,
  onToggleFormalDropdown,
  highlightedGroup,
  highlightedUnassigned,
  onHighlightGroup,
  onHighlightUnassigned,
  onRenameGroup,
  onStartAssign,
}: AnalysisSidebarProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const hasAnyMarks = doc.marks.length > 0;

  function startEditing(key: string, currentTitle: string) {
    setEditingKey(key);
    setEditingValue(currentTitle);
  }

  function commitEditing(tool: MarkTool, id: string) {
    onRenameGroup(tool, id, editingValue.trim());
    setEditingKey(null);
  }

  function renderNamedGroupList(tool: MarkTool, items: NamedMarkGroup[], fallbackPrefix: string) {
    return items.map((item) => {
      const editKey = `${tool}-${item.id}`;
      if (editingKey === editKey) {
        return (
          <input
            key={item.id}
            autoFocus
            className="sidebar-dropdown-rename-input"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={() => commitEditing(tool, item.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEditing(tool, item.id);
              if (e.key === 'Escape') setEditingKey(null);
            }}
          />
        );
      }
      const isActive = highlightedGroup?.tool === tool && highlightedGroup.id === item.id;
      return (
        <div key={item.id} className="sidebar-dropdown-item-row">
          <button
            className={`sidebar-dropdown-item sub${isActive ? ' active' : ''}`}
            onClick={() => onHighlightGroup(tool, item.id)}
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

  function renderToolSection(
    tool: MarkTool,
    header: string,
    items: NamedMarkGroup[],
    fallbackPrefix: string,
    emptyHint: string,
    options?: { assignTriggerLabel?: string; showUnassigned?: boolean },
  ) {
    const sorted = [...items].sort((a, b) => a.order - b.order);
    return (
      <div className="sidebar-dropdown-group" key={tool}>
        {options?.assignTriggerLabel ? (
          <button className="sidebar-dropdown-item" onClick={() => onStartAssign(tool)}>
            {options.assignTriggerLabel}
          </button>
        ) : (
          <div className="sidebar-dropdown-header">{header}</div>
        )}
        {sorted.length === 0 && !options?.assignTriggerLabel && (
          <p className="sidebar-dropdown-empty">{emptyHint}</p>
        )}
        {(sorted.length > 0 || (options?.showUnassigned && hasAnyMarks)) && (
          <div className="sidebar-dropdown-sub">
            {renderNamedGroupList(tool, sorted, fallbackPrefix)}
            {options?.showUnassigned && hasAnyMarks && (
              <button
                className={`sidebar-dropdown-item sub${highlightedUnassigned === tool ? ' active' : ''}`}
                onClick={() => onHighlightUnassigned(tool)}
              >
                keine Zuordnung
              </button>
            )}
          </div>
        )}
      </div>
    );
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
            title="Beobachtungen Inhalt/Aufbau"
          >
            ›
          </button>
        </div>

        {inhaltDropdownOpen && (
          <div className="sidebar-dropdown">
            {renderToolSection(
              'sinnabschnitt',
              'Beobachtungen Inhalt/Aufbau',
              doc.sinnabschnitte,
              'Abschnitt',
              'Noch keine Beobachtungen Inhalt/Aufbau markiert.',
            )}
            {renderToolSection(
              'lyrisches-ich',
              'Lyrisches Ich',
              doc.lyrischesIch,
              'Beobachtung',
              'Noch keine Beobachtungen zum lyrischen Ich markiert.',
            )}
            {renderToolSection(
              'figur',
              'Figuren',
              doc.figuren,
              'Figur',
              'Noch keine Figuren markiert.',
            )}
          </div>
        )}
      </div>

      <div className="sidebar-row-group">
        <div className={`sidebar-row${activeView === 'formal' ? ' active' : ''}`}>
          <button className="sidebar-row-label" onClick={() => onNavigateToTab('formal')}>
            Formale Aspekte
          </button>
          <button
            className={`sidebar-row-arrow${formalDropdownOpen ? ' open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFormalDropdown();
            }}
            title="Formale Aspekte"
          >
            ›
          </button>
        </div>

        {formalDropdownOpen && (
          <div className="sidebar-dropdown">
            {renderToolSection(
              'formale-aspekte',
              'Formale Aspekte',
              doc.formaleAspekte,
              'Beobachtung',
              'Noch keine formalen Aspekte markiert.',
            )}
          </div>
        )}
      </div>

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
            {renderToolSection('wortfeld', 'Wortfelder', doc.wortfelder, 'Wortfeld', '', {
              assignTriggerLabel: 'Wortfelder',
              showUnassigned: true,
            })}
            {renderToolSection(
              'sprache',
              'Sprache',
              doc.sprachmittel,
              'sprachliche Auffälligkeit',
              'Noch keine sprachlichen Auffälligkeiten markiert.',
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

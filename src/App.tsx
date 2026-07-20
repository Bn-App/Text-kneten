import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptyTatteInfo,
  type Line,
  type Mark,
  type Paragraph,
  type Sinnabschnitt,
  type Sprachmittel,
  type TatteInfo,
  type TextDocument,
} from './model/document';
import type { Crop } from './model/crop';
import { FileUpload } from './components/FileUpload';
import { OcrProgress } from './components/OcrProgress';
import { EditableTextPanel, ReadOnlyTextPanel } from './components/EditableTextPanel';
import { CollabModal } from './components/CollabModal';
import { CropSelector } from './components/CropSelector';
import { Toast } from './components/Toast';
import { AnalysisSidebar, type NavTabId } from './components/AnalysisSidebar';
import { HypothesePanel } from './components/panels/HypothesePanel';
import { PlaceholderPanel } from './components/panels/PlaceholderPanel';
import { MarkedGroupListPanel } from './components/panels/MarkedGroupListPanel';
import { SprachlicheMittelInfo } from './components/SprachlicheMittelInfo';
import { ReferenceDropdown } from './components/ReferenceDropdown';
import { LYRIK_SECTIONS } from './lib/sprache/lyrikData';
import { EPIK_SECTIONS } from './lib/sprache/epikData';
import type { HighlightMode } from './components/MarkableText';
import { MarkToolRail, type MarkTool } from './components/MarkToolRail';
import { renderPdfToImages, type RenderedPage } from './lib/pdf/renderPdfToImages';
import { loadImageFile } from './lib/pdf/loadImageFile';
import { recognizeImage } from './lib/ocr/runOcr';
import { pageToLines, linesToEditableText, editableTextToLines } from './lib/ocr/reconstructText';
import { save, list } from './lib/storage/documentStore';
import { useTheme } from './lib/theme/useTheme';
import { useCollab } from './lib/collab/useCollab';
import { downloadDocument, parseDocumentFile } from './lib/persistence/fileIO';
import { useToast } from './lib/toast/useToast';
import './App.css';

type MainView = 'edit' | 'text' | NavTabId;

type ProcessingState =
  | { phase: 'idle' }
  | { phase: 'rendering-pdf' }
  | { phase: 'cropping'; file: File; pages: RenderedPage[] }
  | { phase: 'ocr'; status: string; progress: number; cropInfo?: string }
  | { phase: 'error'; message: string };

function newDocument(file: File): TextDocument {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: file.name,
    createdAt: now,
    updatedAt: now,
    sourceFileName: file.name,
    sourceFileType: file.type === 'application/pdf' ? 'pdf' : 'image',
    pages: [],
    paragraphs: [],
    lines: [],
    marks: [],
    tatte: emptyTatteInfo(),
    hypothese: '',
    sinnabschnitte: [],
    sprachmittel: [],
  };
}

function App() {
  const [doc, setDoc] = useState<TextDocument | null>(null);
  const [editableText, setEditableText] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({ phase: 'idle' });
  const [theme, toggleTheme] = useTheme();
  const [collabModalOpen, setCollabModalOpen] = useState(() => location.hash.startsWith('#room='));
  const loadInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, showToast] = useToast();
  const [activeView, setActiveView] = useState<MainView>('edit');

  const [tatteExpanded, setTatteExpanded] = useState(false);
  const [sprachDropdownOpen, setSprachDropdownOpen] = useState(false);
  const [wortfeldAssignActive, setWortfeldAssignActive] = useState(false);
  const [highlightedWortfeld, setHighlightedWortfeld] = useState<string | 'none' | null>(null);
  const [inhaltDropdownOpen, setInhaltDropdownOpen] = useState(false);
  const [highlightedSinnabschnitt, setHighlightedSinnabschnitt] = useState<string | null>(null);
  const [highlightedSprachmittel, setHighlightedSprachmittel] = useState<string | null>(null);
  const [toolFilterHover, setToolFilterHover] = useState<MarkTool | null>(null);
  const [toolFilterPinned, setToolFilterPinned] = useState<MarkTool | null>(null);
  const [marksHidden, setMarksHidden] = useState(false);

  // Restore the most recently worked-on document from localStorage on load,
  // so a browser reload doesn't appear to wipe out unsaved progress.
  useEffect(() => {
    const docs = list();
    if (docs.length === 0) return;
    const restored = docs[0];
    setDoc(restored);
    setEditableText(linesToEditableText(restored.lines));
    setActiveView('text');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRemoteDocument = useCallback((remoteDoc: TextDocument) => {
    setDoc(remoteDoc);
    setEditableText(linesToEditableText(remoteDoc.lines));
    save(remoteDoc);
  }, []);

  const collab = useCollab(doc, handleRemoteDocument);

  function updateDoc(patch: Partial<TextDocument>) {
    if (!doc) return;
    const updated: TextDocument = { ...doc, ...patch, updatedAt: new Date().toISOString() };
    setDoc(updated);
    save(updated);
  }

  async function handleFileSelected(file: File) {
    setProcessing({ phase: 'rendering-pdf' });
    try {
      const pages = file.type === 'application/pdf' ? await renderPdfToImages(file) : [await loadImageFile(file)];
      setProcessing({ phase: 'cropping', file, pages });
    } catch (err) {
      setProcessing({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleCropsConfirmed(file: File, pages: RenderedPage[], crops: Crop[]) {
    try {
      const newDoc = newDocument(file);
      let allLines: Line[] = [];
      let allParagraphs: Paragraph[] = [];
      let orderOffset = 0;

      for (let i = 0; i < crops.length; i++) {
        const crop = crops[i];
        const cropInfo = crops.length > 1 ? `Ausschnitt ${i + 1}/${crops.length}` : undefined;
        const page = await recognizeImage(
          pages[crop.pageIndex].canvas,
          (status, progress) => setProcessing({ phase: 'ocr', status, progress, cropInfo }),
          { left: crop.x, top: crop.y, width: crop.width, height: crop.height },
        );
        const { lines, paragraphs } = pageToLines(page, crop.pageIndex, orderOffset);
        allLines = allLines.concat(lines);
        allParagraphs = allParagraphs.concat(paragraphs);
        orderOffset += lines.length;
      }

      newDoc.lines = allLines;
      newDoc.paragraphs = allParagraphs;
      const text = linesToEditableText(allLines);

      setDoc(newDoc);
      setEditableText(text);
      save(newDoc);
      setActiveView('edit');
      setProcessing({ phase: 'idle' });
    } catch (err) {
      setProcessing({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  function handleTextChange(text: string) {
    setEditableText(text);
    if (!doc) return;
    const { lines, paragraphs } = editableTextToLines(text);
    updateDoc({ lines, paragraphs });
  }

  function handleSaveClick() {
    if (doc) downloadDocument(doc);
  }

  function handleConfirmBase() {
    if (!doc) return;
    save(doc);
    showToast('Arbeitsbereich gespeichert');
    setActiveView('text');
  }

  async function handleLoadFile(file: File) {
    try {
      const loaded = await parseDocumentFile(file);
      setDoc(loaded);
      setEditableText(linesToEditableText(loaded.lines));
      save(loaded);
      setActiveView('text');
      setProcessing({ phase: 'idle' });
    } catch (err) {
      setProcessing({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  function handleCollabClick() {
    if (!collab.roomUrl) collab.startRoom();
    setCollabModalOpen(true);
  }

  function handleCreateMarks(newMarks: Mark[]) {
    if (!doc) return;
    updateDoc({ marks: [...doc.marks, ...newMarks] });
  }

  function handleDeleteMarkGroup(groupId: string) {
    if (!doc) return;
    updateDoc({ marks: doc.marks.filter((m) => m.groupId !== groupId) });
  }

  function handleSetWortfeldLabel(groupId: string, value: string) {
    if (!doc) return;
    const trimmed = value.trim();
    updateDoc({
      marks: doc.marks.map((m) =>
        m.groupId === groupId ? { ...m, labels: { ...m.labels, wortfeld: trimmed || undefined } } : m,
      ),
    });
  }

  function handleAssignSinnabschnitt(groupId: string, sinnabschnittId: string) {
    if (!doc) return;
    updateDoc({
      marks: doc.marks.map((m) =>
        m.groupId === groupId ? { ...m, labels: { ...m.labels, sinnabschnitt: sinnabschnittId } } : m,
      ),
    });
  }

  function handleCreateSinnabschnittAndAssign(groupId: string) {
    if (!doc) return;
    const newSection: Sinnabschnitt = {
      id: crypto.randomUUID(),
      order: doc.sinnabschnitte.length,
      title: '',
      summary: '',
    };
    updateDoc({
      sinnabschnitte: [...doc.sinnabschnitte, newSection],
      marks: doc.marks.map((m) =>
        m.groupId === groupId ? { ...m, labels: { ...m.labels, sinnabschnitt: newSection.id } } : m,
      ),
    });
  }

  function handleRenameSinnabschnitt(id: string, title: string) {
    if (!doc) return;
    updateDoc({ sinnabschnitte: doc.sinnabschnitte.map((s) => (s.id === id ? { ...s, title } : s)) });
  }

  function handleUpdateSinnabschnittSummary(id: string, summary: string) {
    if (!doc) return;
    updateDoc({ sinnabschnitte: doc.sinnabschnitte.map((s) => (s.id === id ? { ...s, summary } : s)) });
  }

  function handleAssignSprache(groupId: string, sprachmittelId: string) {
    if (!doc) return;
    updateDoc({
      marks: doc.marks.map((m) =>
        m.groupId === groupId ? { ...m, labels: { ...m.labels, sprache: sprachmittelId } } : m,
      ),
    });
  }

  function handleCreateSprachmittelAndAssign(groupId: string) {
    if (!doc) return;
    const newItem: Sprachmittel = {
      id: crypto.randomUUID(),
      order: doc.sprachmittel.length,
      title: '',
      summary: '',
    };
    updateDoc({
      sprachmittel: [...doc.sprachmittel, newItem],
      marks: doc.marks.map((m) =>
        m.groupId === groupId ? { ...m, labels: { ...m.labels, sprache: newItem.id } } : m,
      ),
    });
  }

  function handleRenameSprachmittel(id: string, title: string) {
    if (!doc) return;
    updateDoc({ sprachmittel: doc.sprachmittel.map((s) => (s.id === id ? { ...s, title } : s)) });
  }

  function handleUpdateSprachmittelSummary(id: string, summary: string) {
    if (!doc) return;
    updateDoc({ sprachmittel: doc.sprachmittel.map((s) => (s.id === id ? { ...s, summary } : s)) });
  }

  function handleTatteChange(tatte: TatteInfo) {
    updateDoc({ tatte });
  }

  function handleStartWortfeldAssign() {
    setWortfeldAssignActive(true);
    setHighlightedWortfeld(null);
    setHighlightedSinnabschnitt(null);
    setHighlightedSprachmittel(null);
    setToolFilterPinned(null);
    setMarksHidden(false);
  }

  function handleExitAssignMode() {
    setWortfeldAssignActive(false);
    setHighlightedWortfeld(null);
  }

  function handleHighlightWortfeld(value: string | 'none' | null) {
    setWortfeldAssignActive(false);
    setHighlightedSinnabschnitt(null);
    setHighlightedSprachmittel(null);
    setToolFilterPinned(null);
    setMarksHidden(false);
    setHighlightedWortfeld(value);
  }

  function handleHighlightSinnabschnitt(id: string | null) {
    setWortfeldAssignActive(false);
    setHighlightedWortfeld(null);
    setHighlightedSprachmittel(null);
    setToolFilterPinned(null);
    setMarksHidden(false);
    setHighlightedSinnabschnitt(id);
  }

  function handleHighlightSprachmittel(id: string | null) {
    setWortfeldAssignActive(false);
    setHighlightedWortfeld(null);
    setHighlightedSinnabschnitt(null);
    setToolFilterPinned(null);
    setMarksHidden(false);
    setHighlightedSprachmittel(id);
  }

  function handleToggleToolFilterPin(tool: MarkTool) {
    setWortfeldAssignActive(false);
    setHighlightedWortfeld(null);
    setHighlightedSinnabschnitt(null);
    setHighlightedSprachmittel(null);
    setMarksHidden(false);
    setToolFilterPinned((p) => (p === tool ? null : tool));
  }

  function handleToggleMarksHidden() {
    setWortfeldAssignActive(false);
    setHighlightedWortfeld(null);
    setHighlightedSinnabschnitt(null);
    setHighlightedSprachmittel(null);
    setToolFilterPinned(null);
    setMarksHidden((h) => !h);
  }

  const isBusy = processing.phase === 'rendering-pdf' || processing.phase === 'ocr';
  const collabActive = collab.status === 'waiting' || collab.status === 'connected';

  const interactionMode = wortfeldAssignActive ? 'assign' : 'mark';
  const activeToolFilter = toolFilterHover ?? toolFilterPinned;
  const highlightMode: HighlightMode = wortfeldAssignActive
    ? 'all'
    : activeToolFilter
      ? { tool: activeToolFilter }
      : highlightedWortfeld !== null
        ? { wortfeld: highlightedWortfeld }
        : highlightedSinnabschnitt !== null
          ? { sinnabschnitt: highlightedSinnabschnitt }
          : highlightedSprachmittel !== null
            ? { sprache: highlightedSprachmittel }
            : marksHidden
              ? 'hidden'
              : 'none';

  return (
    <div className="app">
      <header id="toolbar">
        <h1>Text kneten</h1>

        <button className="btn" onClick={handleSaveClick} disabled={!doc} title="Fortschritt als Datei speichern">
          💾 Speichern
        </button>
        <label className="btn" title="Gespeicherten Fortschritt laden">
          📂 Laden
          <input
            ref={loadInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLoadFile(file);
              e.target.value = '';
            }}
          />
        </label>

        {doc && (
          <div className="tab-switch">
            <button
              className={`tab-switch-btn${activeView === 'edit' ? ' active' : ''}`}
              onClick={() => setActiveView('edit')}
            >
              ✏️ Bearbeiten
            </button>
            <button
              className={`tab-switch-btn${activeView === 'text' ? ' active' : ''}`}
              onClick={() => setActiveView('text')}
            >
              📄 Arbeitsbereich
            </button>
          </div>
        )}

        <div className="sep" />

        <button className="btn primary" onClick={handleCollabClick} title="Gemeinsam arbeiten">
          🤝 Gemeinsam
        </button>
        {collabActive && (
          <div className="collab-badge visible">
            <div className="badge-dot" />
            <span>
              {collab.isHost ? `${collab.connectedCount} verbunden` : 'Verbunden'}
            </span>
          </div>
        )}

        <div className="sep" />

        <button className="btn icon" onClick={toggleTheme} title="Farbschema wechseln">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>

      {doc && (
        <nav className="analysis-tab-nav">
          <button
            className={`analysis-tab-btn${activeView === 'text' ? ' active' : ''}`}
            onClick={() => setActiveView('text')}
          >
            Arbeitsbereich
          </button>
          <button
            className={`analysis-tab-btn${activeView === 'hypothese' ? ' active' : ''}`}
            onClick={() => setActiveView('hypothese')}
          >
            Hypothese
          </button>
          <button
            className={`analysis-tab-btn${activeView === 'inhalt' ? ' active' : ''}`}
            onClick={() => setActiveView('inhalt')}
          >
            Inhalt/Aufbau
          </button>
          <button
            className={`analysis-tab-btn${activeView === 'formal' ? ' active' : ''}`}
            onClick={() => setActiveView('formal')}
          >
            Formale Aspekte
          </button>
          <button
            className={`analysis-tab-btn${activeView === 'sprache' ? ' active' : ''}`}
            onClick={() => setActiveView('sprache')}
          >
            Sprache/Stil
          </button>
        </nav>
      )}

      <main className={activeView === 'text' && doc ? 'wide' : ''}>
        {processing.phase !== 'cropping' &&
          activeView !== 'hypothese' &&
          activeView !== 'inhalt' &&
          activeView !== 'formal' &&
          activeView !== 'sprache' && (
            <>
              <p className="subtitle">
                PDF oder Bild hochladen, Ausschnitte markieren, Text erkennen und bearbeiten.
              </p>
              <FileUpload onFileSelected={handleFileSelected} disabled={isBusy} />
            </>
          )}

        {processing.phase === 'rendering-pdf' && <p>PDF wird gerendert…</p>}

        {processing.phase === 'cropping' && (
          <CropSelector
            pages={processing.pages}
            onCancel={() => setProcessing({ phase: 'idle' })}
            onConfirm={(crops) => handleCropsConfirmed(processing.file, processing.pages, crops)}
          />
        )}

        {processing.phase === 'ocr' && (
          <OcrProgress status={processing.status} progress={processing.progress} pageInfo={processing.cropInfo} />
        )}
        {processing.phase === 'error' && <p className="error">Fehler: {processing.message}</p>}

        {doc && processing.phase !== 'cropping' && activeView === 'edit' && (
          <EditableTextPanel
            text={editableText}
            lines={doc.lines}
            onChange={handleTextChange}
            onConfirm={handleConfirmBase}
          />
        )}

        {doc && processing.phase !== 'cropping' && activeView === 'text' && (
          <div className="grundlage-layout">
            <AnalysisSidebar
              doc={doc}
              activeView={activeView}
              onNavigateToTab={(id) => setActiveView(id)}
              tatteExpanded={tatteExpanded}
              onToggleTatte={() => setTatteExpanded((v) => !v)}
              onTatteChange={handleTatteChange}
              sprachDropdownOpen={sprachDropdownOpen}
              onToggleSprachDropdown={() => setSprachDropdownOpen((v) => !v)}
              onStartWortfeldAssign={handleStartWortfeldAssign}
              highlightedWortfeld={highlightedWortfeld}
              onHighlightWortfeld={handleHighlightWortfeld}
              inhaltDropdownOpen={inhaltDropdownOpen}
              onToggleInhaltDropdown={() => setInhaltDropdownOpen((v) => !v)}
              highlightedSinnabschnitt={highlightedSinnabschnitt}
              onHighlightSinnabschnitt={handleHighlightSinnabschnitt}
              onRenameSinnabschnitt={handleRenameSinnabschnitt}
              highlightedSprachmittel={highlightedSprachmittel}
              onHighlightSprachmittel={handleHighlightSprachmittel}
              onRenameSprachmittel={handleRenameSprachmittel}
            />
            <div className="grundlage-main">
              <div className="text-with-rail">
                <ReadOnlyTextPanel
                  doc={doc}
                  highlightMode={highlightMode}
                  interactionMode={interactionMode}
                  onCreateMarks={handleCreateMarks}
                  onDeleteMarkGroup={handleDeleteMarkGroup}
                  onSetWortfeldLabel={handleSetWortfeldLabel}
                  onAssignSinnabschnitt={handleAssignSinnabschnitt}
                  onCreateSinnabschnittAndAssign={handleCreateSinnabschnittAndAssign}
                  onAssignSprache={handleAssignSprache}
                  onCreateSprachmittelAndAssign={handleCreateSprachmittelAndAssign}
                  onExitAssignMode={handleExitAssignMode}
                />
                <MarkToolRail
                  pinned={toolFilterPinned}
                  hidden={marksHidden}
                  onHoverStart={setToolFilterHover}
                  onHoverEnd={() => setToolFilterHover(null)}
                  onTogglePin={handleToggleToolFilterPin}
                  onToggleHidden={handleToggleMarksHidden}
                />
              </div>
            </div>
          </div>
        )}

        {doc && activeView === 'hypothese' && (
          <HypothesePanel hypothese={doc.hypothese} onChange={(hypothese) => updateDoc({ hypothese })} />
        )}
        {doc && activeView === 'inhalt' && (
          <MarkedGroupListPanel
            heading="Inhalt/Aufbau"
            items={doc.sinnabschnitte}
            itemNounSingular="Abschnitt"
            titleFieldLabel="Überschrift"
            summaryFieldLabel="Kurze Zusammenfassung"
            summaryPlaceholder="Worum geht es in diesem Abschnitt?"
            emptyHint='Noch keine Beobachtungen Inhalt/Aufbau markiert. Markiere im Arbeitsbereich einen Textabschnitt und wähle „Beobachtungen Inhalt/Aufbau“.'
            onRename={handleRenameSinnabschnitt}
            onUpdateSummary={handleUpdateSinnabschnittSummary}
          />
        )}
        {doc && activeView === 'formal' && (
          <>
            <ReferenceDropdown icon="📚" label="Lyrik" sections={LYRIK_SECTIONS} />
            <ReferenceDropdown icon="📖" label="Epik" sections={EPIK_SECTIONS} />
            <PlaceholderPanel title="Formale Aspekte" />
          </>
        )}
        {doc && activeView === 'sprache' && (
          <>
            <SprachlicheMittelInfo />
            <MarkedGroupListPanel
              heading="Sprache/Stil"
              items={doc.sprachmittel}
              itemNounSingular="sprachliche Auffälligkeit"
              titleFieldLabel="Bezeichnung"
              summaryFieldLabel="Beschreibung/Wirkung"
              summaryPlaceholder="Was fällt sprachlich auf, und welche Wirkung hat es?"
              emptyHint='Noch keine sprachlichen Auffälligkeiten markiert. Markiere im Arbeitsbereich eine Textstelle und wähle „Sprache“.'
              onRename={handleRenameSprachmittel}
              onUpdateSummary={handleUpdateSprachmittelSummary}
            />
          </>
        )}
      </main>

      <footer id="app-footer">© B. Bruns</footer>

      <Toast message={toastMessage} />

      <CollabModal
        open={collabModalOpen}
        roomUrl={collab.roomUrl}
        status={collab.status}
        connectedCount={collab.connectedCount}
        isHost={collab.isHost}
        errorMessage={collab.errorMessage}
        onClose={() => setCollabModalOpen(false)}
        onLeave={() => {
          collab.leaveRoom();
          setCollabModalOpen(false);
        }}
      />
    </div>
  );
}

export default App;

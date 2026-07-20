import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptyTatteInfo,
  type Line,
  type Mark,
  type NamedMarkGroup,
  type Paragraph,
  type TatteInfo,
  type TextDocument,
} from './model/document';
import type { Crop } from './model/crop';
import { FileUpload } from './components/FileUpload';
import { PasteTextPanel } from './components/PasteTextPanel';
import { OcrProgress } from './components/OcrProgress';
import { EditableTextPanel, ReadOnlyTextPanel } from './components/EditableTextPanel';
import { CollabModal } from './components/CollabModal';
import { OriginalPageModal } from './components/OriginalPageModal';
import { CropSelector } from './components/CropSelector';
import { Toast } from './components/Toast';
import { AnalysisSidebar, type NavTabId } from './components/AnalysisSidebar';
import { HypothesePanel } from './components/panels/HypothesePanel';
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
import { save, load } from './lib/storage/documentStore';
import { useTheme } from './lib/theme/useTheme';
import { useCollab } from './lib/collab/useCollab';
import { downloadDocument, parseDocumentFile } from './lib/persistence/fileIO';
import { exportAnalysisPdf } from './lib/export/exportPdf';
import { useToast } from './lib/toast/useToast';
import './App.css';

type MainView = 'edit' | 'text' | NavTabId;

type ProcessingState =
  | { phase: 'idle' }
  | { phase: 'rendering-pdf' }
  | { phase: 'cropping'; file: File; pages: RenderedPage[] }
  | { phase: 'ocr'; status: string; progress: number; cropInfo?: string }
  | { phase: 'error'; message: string };

function newDocumentBase(title: string, sourceFileName: string, sourceFileType: TextDocument['sourceFileType']): TextDocument {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    sourceFileName,
    sourceFileType,
    pages: [],
    paragraphs: [],
    lines: [],
    marks: [],
    tatte: emptyTatteInfo(),
    hypothese: '',
    sinnabschnitte: [],
    sprachmittel: [],
    wortfelder: [],
    lyrischesIch: [],
    figuren: [],
    formaleAspekte: [],
  };
}

function newDocument(file: File): TextDocument {
  return newDocumentBase(file.name, file.name, file.type === 'application/pdf' ? 'pdf' : 'image');
}

// Tracks which locally saved document belongs to *this* browser tab session.
// sessionStorage (unlike localStorage) is cleared whenever the tab/browser is
// closed, so a new student opening the page in a fresh tab never inherits a
// previous student's work on the same shared computer — while a page reload
// within the same tab still restores the document in progress.
const SESSION_DOC_KEY = 'textkneten:session-doc-id';

const GROUP_ARRAY_KEY: Record<
  MarkTool,
  'wortfelder' | 'sinnabschnitte' | 'sprachmittel' | 'lyrischesIch' | 'figuren' | 'formaleAspekte'
> = {
  wortfeld: 'wortfelder',
  sinnabschnitt: 'sinnabschnitte',
  sprache: 'sprachmittel',
  'lyrisches-ich': 'lyrischesIch',
  figur: 'figuren',
  'formale-aspekte': 'formaleAspekte',
};

function App() {
  const [doc, setDoc] = useState<TextDocument | null>(null);
  const [editableText, setEditableText] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({ phase: 'idle' });
  const [theme, toggleTheme] = useTheme();
  const [collabModalOpen, setCollabModalOpen] = useState(() => location.hash.startsWith('#room='));
  const [originalPageModalOpen, setOriginalPageModalOpen] = useState(false);
  const loadInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, showToast] = useToast();
  const [activeView, setActiveView] = useState<MainView>('edit');

  const [tatteExpanded, setTatteExpanded] = useState(false);
  const [sprachDropdownOpen, setSprachDropdownOpen] = useState(false);
  const [inhaltDropdownOpen, setInhaltDropdownOpen] = useState(false);
  const [formalDropdownOpen, setFormalDropdownOpen] = useState(false);
  const [assignTool, setAssignTool] = useState<MarkTool | null>(null);
  const [highlightedGroup, setHighlightedGroup] = useState<{ tool: MarkTool; id: string } | null>(null);
  const [highlightedUnassigned, setHighlightedUnassigned] = useState<MarkTool | null>(null);
  const [toolFilterHover, setToolFilterHover] = useState<MarkTool | null>(null);
  const [toolFilterPinned, setToolFilterPinned] = useState<MarkTool | null>(null);
  const [marksHidden, setMarksHidden] = useState(false);

  // Binds a document to this tab's session and persists it, so a page reload
  // within the same tab restores exactly this document — and only this one.
  function activateDocument(next: TextDocument, view: MainView = 'text') {
    setDoc(next);
    setEditableText(linesToEditableText(next.lines));
    save(next);
    sessionStorage.setItem(SESSION_DOC_KEY, next.id);
    setActiveView(view);
  }

  // Restore the document belonging to this tab's session (if any) on load, so
  // a reload doesn't wipe out unsaved progress. A brand-new tab/session has no
  // session-doc-id yet and therefore starts blank, even if this browser holds
  // other students' documents from earlier on a shared computer.
  useEffect(() => {
    const sessionDocId = sessionStorage.getItem(SESSION_DOC_KEY);
    if (!sessionDocId) return;
    const restored = load(sessionDocId);
    if (!restored) return;
    setDoc(restored);
    setEditableText(linesToEditableText(restored.lines));
    setActiveView('text');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNewDocument() {
    if (doc && !confirm('Neues Dokument beginnen? Der bisherige Fortschritt bleibt zwar lokal gespeichert, wird danach aber nicht mehr automatisch geöffnet.')) {
      return;
    }
    sessionStorage.removeItem(SESSION_DOC_KEY);
    setDoc(null);
    setEditableText('');
    setActiveView('edit');
    setProcessing({ phase: 'idle' });
  }

  const handleRemoteDocument = useCallback((remoteDoc: TextDocument) => {
    setDoc(remoteDoc);
    setEditableText(linesToEditableText(remoteDoc.lines));
    save(remoteDoc);
    sessionStorage.setItem(SESSION_DOC_KEY, remoteDoc.id);
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
      const usedPageIndices = Array.from(new Set(crops.map((c) => c.pageIndex))).sort((a, b) => a - b);
      newDoc.pages = usedPageIndices.map((idx) => ({
        index: idx,
        imageDataUrl: pages[idx].canvas.toDataURL('image/jpeg', 0.85),
        width: pages[idx].width,
        height: pages[idx].height,
      }));
      activateDocument(newDoc, 'edit');
      setProcessing({ phase: 'idle' });
    } catch (err) {
      setProcessing({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  }

  function handleTextPasted(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const newDoc = newDocumentBase('Eingefügter Text', 'Eingefügter Text', 'text');
    const { lines, paragraphs } = editableTextToLines(trimmed);
    newDoc.lines = lines;
    newDoc.paragraphs = paragraphs;

    activateDocument(newDoc, 'edit');
    setProcessing({ phase: 'idle' });
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

  function handlePdfExportClick() {
    if (doc) exportAnalysisPdf(doc);
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
      activateDocument(loaded, 'text');
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

  function handleAssignGroup(tool: MarkTool, groupId: string, entityId: string) {
    if (!doc) return;
    updateDoc({
      marks: doc.marks.map((m) => (m.groupId === groupId ? { ...m, labels: { ...m.labels, [tool]: entityId } } : m)),
    });
  }

  function handleCreateGroupAndAssign(tool: MarkTool, groupId: string) {
    if (!doc) return;
    const key = GROUP_ARRAY_KEY[tool];
    const items = doc[key];
    const newItem: NamedMarkGroup = { id: crypto.randomUUID(), order: items.length, title: '', summary: '' };
    updateDoc({
      [key]: [...items, newItem],
      marks: doc.marks.map((m) => (m.groupId === groupId ? { ...m, labels: { ...m.labels, [tool]: newItem.id } } : m)),
    } as Partial<TextDocument>);
  }

  function handleRenameGroup(tool: MarkTool, id: string, title: string) {
    if (!doc) return;
    const key = GROUP_ARRAY_KEY[tool];
    const items = doc[key];
    updateDoc({ [key]: items.map((it) => (it.id === id ? { ...it, title } : it)) } as Partial<TextDocument>);
  }

  function handleUpdateGroupSummary(tool: MarkTool, id: string, summary: string) {
    if (!doc) return;
    const key = GROUP_ARRAY_KEY[tool];
    const items = doc[key];
    updateDoc({ [key]: items.map((it) => (it.id === id ? { ...it, summary } : it)) } as Partial<TextDocument>);
  }

  function handleTatteChange(tatte: TatteInfo) {
    updateDoc({ tatte });
  }

  function resetHighlightState() {
    setAssignTool(null);
    setHighlightedGroup(null);
    setHighlightedUnassigned(null);
    setToolFilterPinned(null);
    setMarksHidden(false);
  }

  function handleStartAssign(tool: MarkTool) {
    resetHighlightState();
    setAssignTool(tool);
  }

  function handleExitAssignMode() {
    setAssignTool(null);
  }

  function handleHighlightGroup(tool: MarkTool, id: string) {
    const next = highlightedGroup?.tool === tool && highlightedGroup.id === id ? null : { tool, id };
    resetHighlightState();
    setHighlightedGroup(next);
  }

  function handleHighlightUnassigned(tool: MarkTool) {
    const next = highlightedUnassigned === tool ? null : tool;
    resetHighlightState();
    setHighlightedUnassigned(next);
  }

  function handleToggleToolFilterPin(tool: MarkTool) {
    const next = toolFilterPinned === tool ? null : tool;
    resetHighlightState();
    setToolFilterPinned(next);
  }

  function handleToggleMarksHidden() {
    const next = !marksHidden;
    resetHighlightState();
    setMarksHidden(next);
  }

  const isBusy = processing.phase === 'rendering-pdf' || processing.phase === 'ocr';
  const collabActive = collab.status === 'waiting' || collab.status === 'connected';

  const interactionMode = assignTool ? 'assign' : 'mark';
  const activeToolFilter = toolFilterHover ?? toolFilterPinned;
  const highlightMode: HighlightMode = assignTool
    ? 'all'
    : activeToolFilter
      ? { tool: activeToolFilter }
      : highlightedGroup
        ? { group: highlightedGroup }
        : highlightedUnassigned
          ? { unassigned: highlightedUnassigned }
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
        <button
          className="btn"
          onClick={handlePdfExportClick}
          disabled={!doc}
          title="Analyse als PDF exportieren (für die Bewertung)"
        >
          📥 PDF Export
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

        {doc && (
          <button className="btn" onClick={handleNewDocument} title="Eigenes neues Dokument beginnen">
            🆕 Neu
          </button>
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
        {!doc && processing.phase !== 'cropping' && (
          <>
            <p className="subtitle">PDF oder Bild hochladen, Ausschnitte markieren, Text erkennen und bearbeiten.</p>
            <FileUpload onFileSelected={handleFileSelected} disabled={isBusy} />
            <div className="upload-alt-sep">oder</div>
            <PasteTextPanel onTextSubmit={handleTextPasted} disabled={isBusy} />
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
            onShowOriginal={doc.pages.length > 0 ? () => setOriginalPageModalOpen(true) : undefined}
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
              inhaltDropdownOpen={inhaltDropdownOpen}
              onToggleInhaltDropdown={() => setInhaltDropdownOpen((v) => !v)}
              formalDropdownOpen={formalDropdownOpen}
              onToggleFormalDropdown={() => setFormalDropdownOpen((v) => !v)}
              highlightedGroup={highlightedGroup}
              highlightedUnassigned={highlightedUnassigned}
              onHighlightGroup={handleHighlightGroup}
              onHighlightUnassigned={handleHighlightUnassigned}
              onRenameGroup={handleRenameGroup}
              onStartAssign={handleStartAssign}
            />
            <div className="grundlage-main">
              <div className="text-with-rail">
                <ReadOnlyTextPanel
                  doc={doc}
                  highlightMode={highlightMode}
                  interactionMode={interactionMode}
                  assignTool={assignTool}
                  onCreateMarks={handleCreateMarks}
                  onDeleteMarkGroup={handleDeleteMarkGroup}
                  onAssignGroup={handleAssignGroup}
                  onCreateGroupAndAssign={handleCreateGroupAndAssign}
                  onExitAssignMode={handleExitAssignMode}
                  onShowOriginal={doc.pages.length > 0 ? () => setOriginalPageModalOpen(true) : undefined}
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
          <>
            <MarkedGroupListPanel
              heading="Inhalt/Aufbau"
              items={doc.sinnabschnitte}
              itemNounSingular="Abschnitt"
              titleFieldLabel="Überschrift"
              summaryFieldLabel="Kurze Zusammenfassung"
              summaryPlaceholder="Worum geht es in diesem Abschnitt?"
              emptyHint='Noch keine Beobachtungen Inhalt/Aufbau markiert. Markiere im Arbeitsbereich einen Textabschnitt und wähle „Beobachtungen Inhalt/Aufbau“.'
              tool="sinnabschnitt"
              marks={doc.marks}
              lines={doc.lines}
              onRename={(id, title) => handleRenameGroup('sinnabschnitt', id, title)}
              onUpdateSummary={(id, summary) => handleUpdateGroupSummary('sinnabschnitt', id, summary)}
            />
            <MarkedGroupListPanel
              heading="Lyrisches Ich"
              items={doc.lyrischesIch}
              itemNounSingular="Beobachtung"
              titleFieldLabel="Bezeichnung"
              summaryFieldLabel="Beschreibung"
              summaryPlaceholder="Was fällt beim lyrischen Ich an dieser Stelle auf?"
              emptyHint='Noch keine Beobachtungen zum lyrischen Ich markiert. Markiere im Arbeitsbereich eine Textstelle und wähle „Lyrisches Ich“.'
              tool="lyrisches-ich"
              marks={doc.marks}
              lines={doc.lines}
              onRename={(id, title) => handleRenameGroup('lyrisches-ich', id, title)}
              onUpdateSummary={(id, summary) => handleUpdateGroupSummary('lyrisches-ich', id, summary)}
            />
            <MarkedGroupListPanel
              heading="Figuren"
              items={doc.figuren}
              itemNounSingular="Figur"
              titleFieldLabel="Name"
              summaryFieldLabel="Beschreibung/Charakterisierung"
              summaryPlaceholder="Was zeichnet diese Figur an dieser Stelle aus?"
              emptyHint='Noch keine Figuren markiert. Markiere im Arbeitsbereich eine Textstelle und wähle „Figuren“.'
              tool="figur"
              marks={doc.marks}
              lines={doc.lines}
              onRename={(id, title) => handleRenameGroup('figur', id, title)}
              onUpdateSummary={(id, summary) => handleUpdateGroupSummary('figur', id, summary)}
            />
          </>
        )}
        {doc && activeView === 'formal' && (
          <>
            <ReferenceDropdown icon="📚" label="Lyrik" sections={LYRIK_SECTIONS} />
            <ReferenceDropdown icon="📖" label="Epik" sections={EPIK_SECTIONS} />
            <MarkedGroupListPanel
              heading="Formale Aspekte"
              items={doc.formaleAspekte}
              itemNounSingular="Beobachtung"
              titleFieldLabel="Bezeichnung"
              summaryFieldLabel="Beschreibung"
              summaryPlaceholder="Was fällt hier formal auf, und welche Wirkung hat es?"
              emptyHint='Noch keine formalen Aspekte markiert. Markiere im Arbeitsbereich eine Textstelle und wähle „Formale Aspekte“.'
              tool="formale-aspekte"
              marks={doc.marks}
              lines={doc.lines}
              onRename={(id, title) => handleRenameGroup('formale-aspekte', id, title)}
              onUpdateSummary={(id, summary) => handleUpdateGroupSummary('formale-aspekte', id, summary)}
            />
          </>
        )}
        {doc && activeView === 'sprache' && (
          <>
            <SprachlicheMittelInfo />
            <MarkedGroupListPanel
              heading="Wortfelder"
              items={doc.wortfelder}
              itemNounSingular="Wortfeld"
              titleFieldLabel="Bezeichnung"
              summaryFieldLabel="Beschreibung"
              summaryPlaceholder="Welche Wörter gehören zu diesem Wortfeld, und welche Wirkung hat es?"
              emptyHint='Noch keine Wortfelder markiert. Markiere im Arbeitsbereich eine Textstelle und wähle „Wortfeld“.'
              tool="wortfeld"
              marks={doc.marks}
              lines={doc.lines}
              onRename={(id, title) => handleRenameGroup('wortfeld', id, title)}
              onUpdateSummary={(id, summary) => handleUpdateGroupSummary('wortfeld', id, summary)}
            />
            <MarkedGroupListPanel
              heading="Sprache/Stil"
              items={doc.sprachmittel}
              itemNounSingular="sprachliche Auffälligkeit"
              titleFieldLabel="Bezeichnung"
              summaryFieldLabel="Beschreibung/Wirkung"
              summaryPlaceholder="Was fällt sprachlich auf, und welche Wirkung hat es?"
              emptyHint='Noch keine sprachlichen Auffälligkeiten markiert. Markiere im Arbeitsbereich eine Textstelle und wähle „Sprache“.'
              tool="sprache"
              marks={doc.marks}
              lines={doc.lines}
              onRename={(id, title) => handleRenameGroup('sprache', id, title)}
              onUpdateSummary={(id, summary) => handleUpdateGroupSummary('sprache', id, summary)}
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

      <OriginalPageModal
        pages={doc?.pages ?? []}
        open={originalPageModalOpen}
        onClose={() => setOriginalPageModalOpen(false)}
      />
    </div>
  );
}

export default App;

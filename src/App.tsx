import { useCallback, useEffect, useRef, useState } from 'react';
import {
  emptyTatteInfo,
  type Line,
  type Mark,
  type Paragraph,
  type Sinnabschnitt,
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
import { InhaltAufbauPanel } from './components/panels/InhaltAufbauPanel';
import type { HighlightMode } from './components/MarkableText';
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

  function handleTatteChange(tatte: TatteInfo) {
    updateDoc({ tatte });
  }

  function handleStartWortfeldAssign() {
    setWortfeldAssignActive(true);
    setHighlightedWortfeld(null);
    setHighlightedSinnabschnitt(null);
  }

  function handleExitAssignMode() {
    setWortfeldAssignActive(false);
    setHighlightedWortfeld(null);
  }

  function handleHighlightWortfeld(value: string | 'none' | null) {
    setWortfeldAssignActive(false);
    setHighlightedSinnabschnitt(null);
    setHighlightedWortfeld(value);
  }

  function handleHighlightSinnabschnitt(id: string | null) {
    setWortfeldAssignActive(false);
    setHighlightedWortfeld(null);
    setHighlightedSinnabschnitt(id);
  }

  const isBusy = processing.phase === 'rendering-pdf' || processing.phase === 'ocr';
  const collabActive = collab.status === 'waiting' || collab.status === 'connected';

  const interactionMode = wortfeldAssignActive ? 'assign' : 'mark';
  const highlightMode: HighlightMode = wortfeldAssignActive
    ? 'all'
    : highlightedWortfeld !== null
      ? { wortfeld: highlightedWortfeld }
      : highlightedSinnabschnitt !== null
        ? { sinnabschnitt: highlightedSinnabschnitt }
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
        </nav>
      )}

      <main className={activeView === 'text' && doc ? 'wide' : ''}>
        {processing.phase !== 'cropping' &&
          activeView !== 'hypothese' &&
          activeView !== 'inhalt' &&
          activeView !== 'formal' && (
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
            />
            <div className="grundlage-main">
              <ReadOnlyTextPanel
                doc={doc}
                highlightMode={highlightMode}
                interactionMode={interactionMode}
                onCreateMarks={handleCreateMarks}
                onDeleteMarkGroup={handleDeleteMarkGroup}
                onSetWortfeldLabel={handleSetWortfeldLabel}
                onAssignSinnabschnitt={handleAssignSinnabschnitt}
                onCreateSinnabschnittAndAssign={handleCreateSinnabschnittAndAssign}
                onExitAssignMode={handleExitAssignMode}
              />
            </div>
          </div>
        )}

        {doc && activeView === 'hypothese' && (
          <HypothesePanel hypothese={doc.hypothese} onChange={(hypothese) => updateDoc({ hypothese })} />
        )}
        {doc && activeView === 'inhalt' && (
          <InhaltAufbauPanel
            sinnabschnitte={doc.sinnabschnitte}
            onRename={handleRenameSinnabschnitt}
            onUpdateSummary={handleUpdateSinnabschnittSummary}
          />
        )}
        {doc && activeView === 'formal' && <PlaceholderPanel title="Formale Aspekte" />}
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

export interface Line {
  id: string;
  text: string;
  paragraphId: string;
  pageIndex: number;
  order: number;
  confidence?: number;
  source: 'ocr' | 'user-edited';
}

export interface Paragraph {
  id: string;
  order: number;
}

export interface Page {
  index: number;
  imageDataUrl?: string;
  width: number;
  height: number;
}

export type AnalysisToolId = 'wortfeld' | 'sinnabschnitt' | 'sprache' | 'lyrisches-ich' | 'figur' | 'formale-aspekte';

export type MarkStyle = 'highlight' | 'underline';

export interface Mark {
  id: string;
  groupId: string;
  lineId: string;
  startOffset: number;
  endOffset: number;
  color: string;
  style: MarkStyle;
  labels: Partial<Record<AnalysisToolId, string>>;
  createdAt: string;
}

export interface TatteInfo {
  titel: string;
  autor: string;
  textsorte: string;
  thema: string;
  entstehungszeit: string;
}

export function emptyTatteInfo(): TatteInfo {
  return { titel: '', autor: '', textsorte: '', thema: '', entstehungszeit: '' };
}

/** Ein benannter Eintrag mit Bezeichnung + Beschreibung, wie er bei Sinnabschnitt, Sprache, Wortfeld,
 *  lyrischem Ich und Figuren gleichermaßen verwendet wird. */
export interface NamedMarkGroup {
  id: string;
  order: number;
  title: string;
  summary: string;
}

export type Sinnabschnitt = NamedMarkGroup;
export type Sprachmittel = NamedMarkGroup;
export type Wortfeld = NamedMarkGroup;
export type LyrischesIch = NamedMarkGroup;
export type Figur = NamedMarkGroup;
export type FormaleAspekt = NamedMarkGroup;

export interface TextDocument {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceFileName: string;
  sourceFileType: 'pdf' | 'image';
  pages: Page[];
  paragraphs: Paragraph[];
  lines: Line[];
  marks: Mark[];
  tatte: TatteInfo;
  hypothese: string;
  sinnabschnitte: Sinnabschnitt[];
  sprachmittel: Sprachmittel[];
  wortfelder: Wortfeld[];
  lyrischesIch: LyrischesIch[];
  figuren: Figur[];
  formaleAspekte: FormaleAspekt[];
}

/** Backfills fields added after a document may have been saved, so old saved/loaded docs don't crash the UI. */
export function backfillTextDocument(doc: TextDocument): TextDocument {
  const marks = (doc.marks ?? []).map((m) => ({ ...m, style: m.style ?? 'highlight' }));
  let wortfelder = doc.wortfelder ?? [];

  // Alte Dokumente hatten bei Wortfeld nur ein Freitext-Label statt eines benannten Eintrags.
  // Migriere solche Freitext-Labels zu echten Wortfeld-Einträgen und verlinke die Marks per id.
  if (!doc.wortfelder) {
    const nameToId = new Map<string, string>();
    for (const mark of marks) {
      const label = mark.labels.wortfeld;
      if (!label || nameToId.has(label)) continue;
      const id = `wortfeld-${nameToId.size + 1}-${Math.random().toString(36).slice(2, 8)}`;
      nameToId.set(label, id);
    }
    wortfelder = Array.from(nameToId.entries()).map(([title, id], index) => ({
      id,
      order: index,
      title,
      summary: '',
    }));
    for (const mark of marks) {
      const label = mark.labels.wortfeld;
      if (label && nameToId.has(label)) {
        mark.labels.wortfeld = nameToId.get(label);
      }
    }
  }

  return {
    ...doc,
    marks,
    tatte: doc.tatte ?? emptyTatteInfo(),
    hypothese: doc.hypothese ?? '',
    sinnabschnitte: doc.sinnabschnitte ?? [],
    sprachmittel: doc.sprachmittel ?? [],
    wortfelder,
    lyrischesIch: doc.lyrischesIch ?? [],
    figuren: doc.figuren ?? [],
    formaleAspekte: doc.formaleAspekte ?? [],
  };
}

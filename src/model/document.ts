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

export type AnalysisToolId = 'wortfeld' | 'sinnabschnitt' | 'sprache';

export interface Mark {
  id: string;
  groupId: string;
  lineId: string;
  startOffset: number;
  endOffset: number;
  color: string;
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

export interface Sinnabschnitt {
  id: string;
  order: number;
  title: string;
  summary: string;
}

export interface Sprachmittel {
  id: string;
  order: number;
  title: string;
  summary: string;
}

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
}

/** Backfills fields added after a document may have been saved, so old saved/loaded docs don't crash the UI. */
export function backfillTextDocument(doc: TextDocument): TextDocument {
  return {
    ...doc,
    marks: doc.marks ?? [],
    tatte: doc.tatte ?? emptyTatteInfo(),
    hypothese: doc.hypothese ?? '',
    sinnabschnitte: doc.sinnabschnitte ?? [],
    sprachmittel: doc.sprachmittel ?? [],
  };
}

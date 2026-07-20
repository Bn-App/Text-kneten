import { jsPDF } from 'jspdf';
import type { Line, Mark, NamedMarkGroup, TextDocument } from '../../model/document';
import type { MarkTool } from '../../components/MarkableText';
import { excerptsForItem } from '../marks/excerpts';
import { linesToEditableText } from '../ocr/reconstructText';

const MARGIN = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 5.2;

interface ExportContext {
  doc: jsPDF;
  y: number;
}

function ensureSpace(ctx: ExportContext, needed: number) {
  if (ctx.y + needed > PAGE_HEIGHT - MARGIN) {
    ctx.doc.addPage();
    ctx.y = MARGIN;
  }
}

function addHeading(ctx: ExportContext, text: string, size = 13) {
  ensureSpace(ctx, LINE_HEIGHT * 2);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(size);
  ctx.doc.setTextColor(20, 20, 20);
  ctx.doc.text(text, MARGIN, ctx.y);
  ctx.y += LINE_HEIGHT * 1.4;
  ctx.doc.setFont('helvetica', 'normal');
}

function addSubheading(ctx: ExportContext, text: string) {
  ensureSpace(ctx, LINE_HEIGHT * 1.6);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(11);
  ctx.doc.setTextColor(30, 30, 30);
  ctx.doc.text(text, MARGIN, ctx.y);
  ctx.y += LINE_HEIGHT * 1.3;
  ctx.doc.setFont('helvetica', 'normal');
}

function addParagraph(
  ctx: ExportContext,
  text: string,
  opts?: { size?: number; italic?: boolean; indent?: number; color?: [number, number, number] },
) {
  const size = opts?.size ?? 10.5;
  const indent = opts?.indent ?? 0;
  ctx.doc.setFont('helvetica', opts?.italic ? 'italic' : 'normal');
  ctx.doc.setFontSize(size);
  const [r, g, b] = opts?.color ?? [40, 40, 40];
  ctx.doc.setTextColor(r, g, b);
  const wrapped: string[] = ctx.doc.splitTextToSize(text || ' ', CONTENT_WIDTH - indent);
  for (const line of wrapped) {
    ensureSpace(ctx, LINE_HEIGHT);
    ctx.doc.text(line, MARGIN + indent, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
}

function addSpacer(ctx: ExportContext, h = LINE_HEIGHT) {
  ctx.y += h;
}

function addDivider(ctx: ExportContext) {
  ensureSpace(ctx, 6);
  ctx.doc.setDrawColor(210);
  ctx.doc.line(MARGIN, ctx.y, PAGE_WIDTH - MARGIN, ctx.y);
  ctx.y += 6;
}

interface GroupSectionSpec {
  heading: string;
  tool: MarkTool;
  items: NamedMarkGroup[];
  itemNounSingular: string;
  summaryLabel: string;
  emptyHint: string;
}

function addGroupSection(ctx: ExportContext, spec: GroupSectionSpec, marks: Mark[], lines: Line[]) {
  addHeading(ctx, spec.heading);
  const sorted = [...spec.items].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) {
    addParagraph(ctx, spec.emptyHint, { italic: true, color: [140, 140, 140] });
    addSpacer(ctx, 4);
    return;
  }

  sorted.forEach((item) => {
    const title = item.title.trim() || `${spec.itemNounSingular} ${item.order + 1}`;
    addSubheading(ctx, `${item.order + 1}. ${title}`);

    const excerpts = excerptsForItem(item.id, spec.tool, marks, lines);
    excerpts.forEach((text) => addParagraph(ctx, `„${text}“`, { italic: true, indent: 4, color: [95, 95, 95] }));

    const summary = item.summary.trim();
    addParagraph(ctx, `${spec.summaryLabel}: ${summary || '—'}`, {
      indent: 4,
      italic: !summary,
      color: summary ? [40, 40, 40] : [150, 150, 150],
    });
    addSpacer(ctx, 4);
  });
}

/** Assembles every TATTE-field, hypothesis, base text, and analysis entry into a single
 * printable PDF, so a teacher can grade a student's work without opening the app. */
export function exportAnalysisPdf(doc: TextDocument): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const ctx: ExportContext = { doc: pdf, y: MARGIN };

  addHeading(ctx, doc.title || 'Text kneten – Analyse', 17);
  addParagraph(ctx, `Export erstellt am ${new Date().toLocaleDateString('de-DE')}`, {
    size: 9,
    italic: true,
    color: [130, 130, 130],
  });
  addSpacer(ctx, 3);
  addDivider(ctx);

  addHeading(ctx, 'Basisinformationen (TATTE)');
  const tatteRows: [string, string][] = [
    ['Titel', doc.tatte.titel],
    ['Autor:in', doc.tatte.autor],
    ['Textsorte', doc.tatte.textsorte],
    ['Thema', doc.tatte.thema],
    ['Entstehungszeit', doc.tatte.entstehungszeit],
  ];
  tatteRows.forEach(([label, value]) => addParagraph(ctx, `${label}: ${value.trim() || '—'}`));
  addSpacer(ctx, 4);
  addDivider(ctx);

  addHeading(ctx, 'Hypothese');
  const hypothese = doc.hypothese.trim();
  addParagraph(ctx, hypothese || '—', hypothese ? undefined : { italic: true, color: [150, 150, 150] });
  addSpacer(ctx, 4);
  addDivider(ctx);

  addHeading(ctx, 'Arbeitsbereich (Grundlagentext)');
  const fullText = linesToEditableText(doc.lines);
  const paragraphs = fullText.split(/\n{2,}/);
  paragraphs.forEach((para, i) => {
    para.split('\n').forEach((line) => addParagraph(ctx, line));
    if (i < paragraphs.length - 1) addSpacer(ctx, 2);
  });
  addSpacer(ctx, 4);
  addDivider(ctx);

  const sections: GroupSectionSpec[] = [
    {
      heading: 'Inhalt/Aufbau – Beobachtungen',
      tool: 'sinnabschnitt',
      items: doc.sinnabschnitte,
      itemNounSingular: 'Abschnitt',
      summaryLabel: 'Zusammenfassung',
      emptyHint: 'Keine Beobachtungen Inhalt/Aufbau markiert.',
    },
    {
      heading: 'Lyrisches Ich',
      tool: 'lyrisches-ich',
      items: doc.lyrischesIch,
      itemNounSingular: 'Beobachtung',
      summaryLabel: 'Beschreibung',
      emptyHint: 'Keine Beobachtungen zum lyrischen Ich markiert.',
    },
    {
      heading: 'Figuren',
      tool: 'figur',
      items: doc.figuren,
      itemNounSingular: 'Figur',
      summaryLabel: 'Beschreibung/Charakterisierung',
      emptyHint: 'Keine Figuren markiert.',
    },
    {
      heading: 'Formale Aspekte',
      tool: 'formale-aspekte',
      items: doc.formaleAspekte,
      itemNounSingular: 'Beobachtung',
      summaryLabel: 'Beschreibung',
      emptyHint: 'Keine formalen Aspekte markiert.',
    },
    {
      heading: 'Wortfelder',
      tool: 'wortfeld',
      items: doc.wortfelder,
      itemNounSingular: 'Wortfeld',
      summaryLabel: 'Beschreibung',
      emptyHint: 'Keine Wortfelder markiert.',
    },
    {
      heading: 'Sprache/Stil – sprachliche Auffälligkeiten',
      tool: 'sprache',
      items: doc.sprachmittel,
      itemNounSingular: 'sprachliche Auffälligkeit',
      summaryLabel: 'Beschreibung/Wirkung',
      emptyHint: 'Keine sprachlichen Auffälligkeiten markiert.',
    },
  ];

  sections.forEach((spec, i) => {
    addGroupSection(ctx, spec, doc.marks, doc.lines);
    if (i < sections.length - 1) addDivider(ctx);
  });

  const pageCount = pdf.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Text kneten – Analyse-Export  •  Seite ${p}/${pageCount}`, MARGIN, PAGE_HEIGHT - 8);
  }

  const safeTitle = (doc.title || 'Analyse').replace(/[\\/:*?"<>|]/g, '_').trim() || 'Analyse';
  pdf.save(`${safeTitle} – Analyse.pdf`);
}

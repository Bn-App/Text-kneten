import type { Line, Paragraph } from '../../model/document';

function average(nums: number[]): number | undefined {
  if (nums.length === 0) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Builds Line/Paragraph records from a single Tesseract page result.
 *
 * Tesseract's own block/paragraph grouping is tuned for prose layout
 * analysis and unreliably splits evenly-spaced verse into one
 * "paragraph" per line. We therefore flatten all lines in reading
 * order and detect paragraph/stanza breaks ourselves from the actual
 * vertical gap between consecutive lines (a gap noticeably larger
 * than the page's typical line spacing means a blank line in the
 * source), rather than trusting Tesseract's paragraph objects.
 */
export function pageToLines(
  page: Tesseract.Page,
  pageIndex: number,
  orderOffset: number,
): { lines: Line[]; paragraphs: Paragraph[] } {
  const flatLines = (page.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((para) => para.lines));

  if (flatLines.length === 0) return { lines: [], paragraphs: [] };

  const gaps: number[] = [];
  for (let i = 1; i < flatLines.length; i++) {
    gaps.push(flatLines[i].bbox.y0 - flatLines[i - 1].bbox.y0);
  }
  const typicalGap = gaps.length > 0 ? median(gaps.filter((g) => g > 0)) : 0;
  const paragraphBreakThreshold = typicalGap * 1.5;

  const lines: Line[] = [];
  const paragraphs: Paragraph[] = [];
  let order = orderOffset;
  let paragraphOrder = 0;
  let paragraphId = crypto.randomUUID();
  paragraphs.push({ id: paragraphId, order: paragraphOrder });

  flatLines.forEach((line, i) => {
    if (i > 0 && typicalGap > 0) {
      const gap = line.bbox.y0 - flatLines[i - 1].bbox.y0;
      if (gap > paragraphBreakThreshold) {
        paragraphId = crypto.randomUUID();
        paragraphOrder += 1;
        paragraphs.push({ id: paragraphId, order: paragraphOrder });
      }
    }
    lines.push({
      id: crypto.randomUUID(),
      text: line.text.replace(/\n+$/, ''),
      paragraphId,
      pageIndex,
      order: order++,
      confidence: average(line.words.map((w) => w.confidence)),
      source: 'ocr',
    });
  });

  return { lines, paragraphs };
}

/** Flattens Line[] (grouped by paragraphId, in order) into editable text. */
export function linesToEditableText(lines: Line[]): string {
  const sorted = [...lines].sort((a, b) => a.order - b.order);
  const paragraphChunks: string[] = [];
  let currentParagraphId: string | null = null;
  let currentChunk: string[] = [];

  for (const line of sorted) {
    if (line.paragraphId !== currentParagraphId) {
      if (currentChunk.length > 0) paragraphChunks.push(currentChunk.join('\n'));
      currentChunk = [];
      currentParagraphId = line.paragraphId;
    }
    currentChunk.push(line.text);
  }
  if (currentChunk.length > 0) paragraphChunks.push(currentChunk.join('\n'));

  return paragraphChunks.join('\n\n');
}

/** Rebuilds a flat Line[] from user-edited text, preserving structure only (no OCR metadata). */
export function editableTextToLines(text: string, pageIndex = 0): { lines: Line[]; paragraphs: Paragraph[] } {
  const lines: Line[] = [];
  const paragraphs: Paragraph[] = [];
  const paragraphTexts = text.split(/\n{2,}/);
  let order = 0;

  paragraphTexts.forEach((paraText, paragraphOrder) => {
    const paragraphId = crypto.randomUUID();
    paragraphs.push({ id: paragraphId, order: paragraphOrder });
    const lineTexts = paraText.split('\n');
    for (const lineText of lineTexts) {
      lines.push({
        id: crypto.randomUUID(),
        text: lineText,
        paragraphId,
        pageIndex,
        order: order++,
        source: 'user-edited',
      });
    }
  });

  return { lines, paragraphs };
}

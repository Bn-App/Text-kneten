interface OcrProgressProps {
  status: string;
  progress: number;
  pageInfo?: string;
}

const STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': 'Tesseract wird geladen…',
  'initializing tesseract': 'Tesseract wird initialisiert…',
  'loading language traineddata': 'Sprachdaten werden geladen (ca. 10–15 MB, beim ersten Mal)…',
  'initializing api': 'API wird initialisiert…',
  'recognizing text': 'Text wird erkannt…',
};

export function OcrProgress({ status, progress, pageInfo }: OcrProgressProps) {
  const label = STATUS_LABELS[status] ?? status;
  return (
    <div className="ocr-progress">
      <p>
        {pageInfo ? `${pageInfo} — ` : ''}
        {label}
      </p>
      <progress value={progress} max={1} />
    </div>
  );
}

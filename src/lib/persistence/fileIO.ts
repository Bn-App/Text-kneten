import { backfillTextDocument, type TextDocument } from '../../model/document';

export function downloadDocument(doc: TextDocument): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title || 'text-kneten'}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseDocumentFile(file: File): Promise<TextDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data || !Array.isArray(data.lines) || !Array.isArray(data.paragraphs)) {
          throw new Error('Ungültige Datei: kein Text-kneten-Dokument');
        }
        resolve(backfillTextDocument(data as TextDocument));
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden'));
    reader.readAsText(file);
  });
}

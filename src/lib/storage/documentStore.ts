import { backfillTextDocument, type TextDocument } from '../../model/document';

const KEY_PREFIX = 'textkneten:doc:';

export function save(doc: TextDocument): void {
  localStorage.setItem(KEY_PREFIX + doc.id, JSON.stringify(doc));
}

export function load(id: string): TextDocument | null {
  const raw = localStorage.getItem(KEY_PREFIX + id);
  return raw ? backfillTextDocument(JSON.parse(raw) as TextDocument) : null;
}

export function remove(id: string): void {
  localStorage.removeItem(KEY_PREFIX + id);
}

export function list(): TextDocument[] {
  const docs: TextDocument[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX)) {
      const raw = localStorage.getItem(key);
      if (raw) docs.push(backfillTextDocument(JSON.parse(raw) as TextDocument));
    }
  }
  return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

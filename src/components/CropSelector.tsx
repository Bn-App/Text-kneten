import { useMemo, useRef, useState } from 'react';
import type { Crop } from '../model/crop';
import type { RenderedPage } from '../lib/pdf/renderPdfToImages';

interface CropSelectorProps {
  pages: RenderedPage[];
  onConfirm: (crops: Crop[]) => void;
  onCancel: () => void;
}

const MIN_CROP_SIZE = 8;

interface DraftRect {
  startX: number;
  startY: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CropSelector({ pages, onConfirm, onCancel }: CropSelectorProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const page = pages[pageIndex];
  const displayUrl = useMemo(() => page.canvas.toDataURL(), [page]);

  function toNaturalPoint(clientX: number, clientY: number) {
    const img = imageRef.current;
    if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect();
    const scaleX = page.width / rect.width;
    const scaleY = page.height / rect.height;
    const x = Math.min(Math.max((clientX - rect.left) * scaleX, 0), page.width);
    const y = Math.min(Math.max((clientY - rect.top) * scaleY, 0), page.height);
    return { x, y };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = toNaturalPoint(e.clientX, e.clientY);
    setDraft({ startX: x, startY: y, x, y, width: 0, height: 0 });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draft) return;
    const { x, y } = toNaturalPoint(e.clientX, e.clientY);
    const nx = Math.min(draft.startX, x);
    const ny = Math.min(draft.startY, y);
    const width = Math.abs(x - draft.startX);
    const height = Math.abs(y - draft.startY);
    setDraft({ ...draft, x: nx, y: ny, width, height });
  }

  function handlePointerUp() {
    if (draft && draft.width > MIN_CROP_SIZE && draft.height > MIN_CROP_SIZE) {
      setCrops((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          pageIndex,
          x: Math.round(draft.x),
          y: Math.round(draft.y),
          width: Math.round(draft.width),
          height: Math.round(draft.height),
        },
      ]);
    }
    setDraft(null);
  }

  function addWholePage() {
    setCrops((prev) => [
      ...prev,
      { id: crypto.randomUUID(), pageIndex, x: 0, y: 0, width: page.width, height: page.height },
    ]);
  }

  function removeCrop(id: string) {
    setCrops((prev) => prev.filter((c) => c.id !== id));
  }

  const pageCrops = crops.filter((c) => c.pageIndex === pageIndex);
  const scale = imageRef.current ? imageRef.current.getBoundingClientRect().width / page.width : 0;

  function toDisplayRect(c: { x: number; y: number; width: number; height: number }) {
    return {
      left: c.x * scale,
      top: c.y * scale,
      width: c.width * scale,
      height: c.height * scale,
    };
  }

  return (
    <div className="crop-selector">
      <p className="subtitle">
        Ziehe mit der Maus ein oder mehrere Rechtecke über den Text, der erkannt werden soll.
      </p>

      {pages.length > 1 && (
        <div className="crop-page-nav">
          <button className="btn" disabled={pageIndex === 0} onClick={() => setPageIndex((i) => i - 1)}>
            ‹ Vorherige
          </button>
          <span>
            Seite {pageIndex + 1}/{pages.length}
          </span>
          <button
            className="btn"
            disabled={pageIndex === pages.length - 1}
            onClick={() => setPageIndex((i) => i + 1)}
          >
            Nächste ›
          </button>
        </div>
      )}

      <div
        className="crop-canvas-wrap"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img ref={imageRef} src={displayUrl} alt={`Seite ${pageIndex + 1}`} draggable={false} />

        {pageCrops.map((c) => {
          const r = toDisplayRect(c);
          return (
            <div key={c.id} className="crop-rect" style={{ left: r.left, top: r.top, width: r.width, height: r.height }}>
              <span className="crop-rect-label">{crops.indexOf(c) + 1}</span>
              <button
                className="crop-rect-del"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCrop(c.id);
                }}
                title="Ausschnitt entfernen"
              >
                ×
              </button>
            </div>
          );
        })}

        {draft && (
          <div
            className="crop-rect draft"
            style={{ ...toDisplayRect(draft) }}
          />
        )}
      </div>

      <div className="crop-footer">
        <button className="btn" onClick={addWholePage}>
          + Ganze Seite als Ausschnitt
        </button>
        <span className="crop-count">
          {crops.length} Ausschnitt{crops.length === 1 ? '' : 'e'} ausgewählt
        </span>
        <div className="crop-footer-actions">
          <button className="btn" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn primary" disabled={crops.length === 0} onClick={() => onConfirm(crops)}>
            Text übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}

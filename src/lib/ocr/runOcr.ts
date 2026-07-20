import { createWorker } from 'tesseract.js';

export type OcrProgressCallback = (status: string, progress: number) => void;

let workerPromise: Promise<Tesseract.Worker> | null = null;

async function getWorker(onProgress?: OcrProgressCallback): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('deu', 1, {
      logger: (m) => onProgress?.(m.status, m.progress),
    });
  }
  return workerPromise;
}

export async function recognizeImage(
  image: Tesseract.ImageLike,
  onProgress?: OcrProgressCallback,
  rectangle?: Tesseract.Rectangle,
): Promise<Tesseract.Page> {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(image, rectangle ? { rectangle } : {}, { blocks: true, text: true });
  return data;
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}

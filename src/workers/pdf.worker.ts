import { mergePdf, splitPdf, getPdfPageCount } from '../core/pdf';
import { extractTextFromPdf } from '../core/pdf-text';

export interface WorkerRequest {
  id: number;
  type: 'merge' | 'split' | 'pageCount' | 'extractText';
  files?: Uint8Array[];
  file?: Uint8Array;
  pageIndices?: number[];
}

export interface WorkerResponse {
  id: number;
  success: boolean;
  data?: Uint8Array | number | string;
  error?: string;
}

// In standard Web Worker scope
const workerContext = self as unknown as {
  postMessage: (message: WorkerResponse, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

workerContext.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;

  try {
    switch (req.type) {
      case 'merge': {
        if (!req.files) throw new Error('Missing files for merge');
        const merged = await mergePdf(req.files);
        const res: WorkerResponse = { id: req.id, success: true, data: merged };
        workerContext.postMessage(res, [merged.buffer]);
        break;
      }

      case 'split': {
        if (!req.file || !req.pageIndices) throw new Error('Missing file or indices for split');
        const split = await splitPdf(req.file, req.pageIndices);
        const res: WorkerResponse = { id: req.id, success: true, data: split };
        workerContext.postMessage(res, [split.buffer]);
        break;
      }

      case 'pageCount': {
        if (!req.file) throw new Error('Missing file for page count');
        const count = await getPdfPageCount(req.file);
        const res: WorkerResponse = { id: req.id, success: true, data: count };
        workerContext.postMessage(res);
        break;
      }

      case 'extractText': {
        if (!req.file) throw new Error('Missing file for text extraction');
        const text = await extractTextFromPdf(req.file);
        const res: WorkerResponse = { id: req.id, success: true, data: text };
        workerContext.postMessage(res);
        break;
      }

      default:
        throw new Error(`Unknown request type: ${(req as WorkerRequest).type}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown worker error';
    const res: WorkerResponse = { id: req.id, success: false, error: message };
    workerContext.postMessage(res);
  }
};

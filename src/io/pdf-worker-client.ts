import type { WorkerRequest, WorkerResponse } from '../workers/pdf.worker';
import { extractTextFromPdf } from '../core/pdf-text';

class PdfWorkerClient {
  private worker: Worker | null = null;
  private reqId = 0;
  private pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason: Error) => void;
    }
  >();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../workers/pdf.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success, data, error } = event.data;
        const entry = this.pending.get(id);
        if (!entry) return;

        this.pending.delete(id);
        if (success) {
          entry.resolve(data);
        } else {
          entry.reject(new Error(error || 'PDF operation failed'));
        }
      };

      this.worker.onerror = (err) => {
        for (const [id, entry] of this.pending.entries()) {
          this.pending.delete(id);
          entry.reject(new Error(`Worker error: ${err.message}`));
        }
      };
    }

    return this.worker;
  }

  private send<T>(request: Omit<WorkerRequest, 'id'>, transfer: Transferable[] = []): Promise<T> {
    const id = ++this.reqId;
    const worker = this.getWorker();

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (val) => resolve(val as T),
        reject,
      });

      worker.postMessage({ ...request, id }, transfer);
    });
  }

  public async merge(files: Uint8Array[]): Promise<Uint8Array> {
    const transfer = files.map((f) => f.buffer);
    return await this.send<Uint8Array>({ type: 'merge', files }, transfer);
  }

  public async split(file: Uint8Array, pageIndices: number[]): Promise<Uint8Array> {
    return await this.send<Uint8Array>(
      { type: 'split', file, pageIndices },
      [file.buffer]
    );
  }

  public async getPageCount(file: Uint8Array): Promise<number> {
    const copy = new Uint8Array(file);
    return await this.send<number>({ type: 'pageCount', file: copy }, [copy.buffer]);
  }

  public async extractText(file: Uint8Array): Promise<string> {
    return await extractTextFromPdf(file);
  }
}

export const pdfWorkerClient = new PdfWorkerClient();

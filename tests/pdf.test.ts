import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdf, splitPdf, getPdfPageCount } from '../src/core/pdf';

async function createSamplePdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([200, 200]);
  }
  return await doc.save();
}

describe('PDF core operations', () => {
  it('counts pages correctly', async () => {
    const pdfBytes = await createSamplePdf(3);
    const count = await getPdfPageCount(pdfBytes);
    expect(count).toBe(3);
  });

  it('merges multiple PDFs in order', async () => {
    const pdf1 = await createSamplePdf(2);
    const pdf2 = await createSamplePdf(3);

    const merged = await mergePdf([pdf1, pdf2]);
    const mergedDoc = await PDFDocument.load(merged);

    expect(mergedDoc.getPageCount()).toBe(5);
  });

  it('splits PDF pages according to indices', async () => {
    const pdf = await createSamplePdf(5);
    // Extract pages 1 and 3 (0-based indices 0 and 2)
    const split = await splitPdf(pdf, [0, 2]);
    const splitDoc = await PDFDocument.load(split);

    expect(splitDoc.getPageCount()).toBe(2);
  });

  it('throws error when splitting with out-of-bounds indices', async () => {
    const pdf = await createSamplePdf(3);
    await expect(splitPdf(pdf, [0, 5])).rejects.toThrow('Page index 6 is out of bounds (PDF has 3 pages)');
  });

  it('throws error when merging empty list', async () => {
    await expect(mergePdf([])).rejects.toThrow('No PDF files provided for merge');
  });
});

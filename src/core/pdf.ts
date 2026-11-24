import { PDFDocument } from 'pdf-lib';

export async function getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes);
  return doc.getPageCount();
}

export async function mergePdf(pdfBytesList: Uint8Array[]): Promise<Uint8Array> {
  if (pdfBytesList.length === 0) {
    throw new Error('No PDF files provided for merge');
  }

  const mergedDoc = await PDFDocument.create();

  for (const bytes of pdfBytesList) {
    const srcDoc = await PDFDocument.load(bytes);
    const indices = srcDoc.getPageIndices();
    const copiedPages = await mergedDoc.copyPages(srcDoc, indices);
    for (const page of copiedPages) {
      mergedDoc.addPage(page);
    }
  }

  return await mergedDoc.save();
}

export async function splitPdf(
  pdfBytes: Uint8Array,
  pageIndices: number[]
): Promise<Uint8Array> {
  if (pageIndices.length === 0) {
    throw new Error('No pages selected for split');
  }

  const srcDoc = await PDFDocument.load(pdfBytes);
  const total = srcDoc.getPageCount();

  for (const idx of pageIndices) {
    if (idx < 0 || idx >= total) {
      throw new Error(`Page index ${idx + 1} is out of bounds (PDF has ${total} pages)`);
    }
  }

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  for (const page of copiedPages) {
    newDoc.addPage(page);
  }

  return await newDoc.save();
}

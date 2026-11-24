import { describe, it, expect } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractTextFromPdf } from '../src/core/pdf-text';

describe('extractTextFromPdf', () => {
  it('extracts text from a generated text PDF', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([400, 400]);
    page.drawText('Hello World PDF Text', { x: 50, y: 350, font, size: 14 });
    const pdfBytes = await doc.save();

    const extracted = await extractTextFromPdf(pdfBytes);
    expect(extracted).toContain('Hello World PDF Text');
  });
});

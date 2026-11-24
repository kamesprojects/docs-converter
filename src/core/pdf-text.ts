import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// In a real browser, point to the locally bundled worker asset.
// In test environments (jsdom / Node), leave empty so PDF.js falls back to in-process parsing.
const isRealBrowser =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  !navigator.userAgent.includes('jsdom') &&
  !navigator.userAgent.includes('Node.js');

if (isRealBrowser) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  if (isRealBrowser && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }

  const loadingTask = pdfjsLib.getDocument({
    data: pdfBytes,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const numPages = doc.numPages;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    let pageStr = '';
    let lastY: number | null = null;

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] };
        const currentY = textItem.transform[5];

        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          pageStr += '\n';
        } else if (pageStr.length > 0 && !pageStr.endsWith('\n') && !pageStr.endsWith(' ')) {
          pageStr += ' ';
        }

        pageStr += textItem.str;
        lastY = currentY;
      }
    }

    pageTexts.push(pageStr.trim());
  }

  return pageTexts.filter(Boolean).join('\n\n') + '\n';
}

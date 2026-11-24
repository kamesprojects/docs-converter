import * as pdfjsLib from 'pdfjs-dist';

export async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
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

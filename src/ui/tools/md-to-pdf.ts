import { readFileAsText } from '../../io/file-reader';
import { renderMarkdown } from '../../core/markdown';
import { showError, clearError } from '../error';

export function renderMdToPdfHtml(): string {
  return `
    <form class="space-y-3">
      <input type="file" name="files" accept=".md" multiple required class="block w-full">
      <button type="submit" name="action" value="convert" class="bg-blue-600 text-white px-4 py-2 rounded">Convert</button>
      <button type="submit" name="action" value="download" class="bg-green-600 text-white px-4 py-2 rounded">Download</button>
      <button type="reset" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

function printHtmlDocument(sectionsHtml: string): void {
  const fullHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>documents.pdf</title>
    <style>
      @page {
        margin: 1.5cm;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        line-height: 1.55;
        color: #111827;
        margin: 0;
        padding: 0;
      }
      .doc-section {
        page-break-before: always;
        break-before: page;
      }
      .doc-section:first-child {
        page-break-before: avoid;
        break-before: avoid;
      }
      h1 { font-size: 24px; margin-top: 0; margin-bottom: 16px; }
      h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; }
      h3 { font-size: 15px; margin-top: 16px; margin-bottom: 8px; }
      p { margin-bottom: 12px; }
      code {
        background: #f3f4f6;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: Consolas, monospace;
        font-size: 13px;
      }
      pre {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        padding: 12px;
        overflow-x: auto;
      }
      pre code {
        background: none;
        padding: 0;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 12px 0;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 6px 10px;
        text-align: left;
      }
      th {
        background: #f3f4f6;
      }
    </style>
  </head>
  <body>
    ${sectionsHtml}
  </body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');

  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    });
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
  } else {
    // If popup is blocked, create an invisible iframe to print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 60000);
    };
  }
}

export function attachMdToPdfHandlers(form: HTMLFormElement): void {
  const filesInput = form.querySelector('input[name="files"]') as HTMLInputElement;

  form.onreset = () => {
    clearError(form);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    clearError(form);

    const files = filesInput.files;
    if (!files || files.length === 0) {
      showError(form, 'Please select at least one Markdown file.');
      return;
    }

    try {
      const texts = await Promise.all(Array.from(files).map(readFileAsText));
      const sectionsHtml = texts
        .map((text) => `<section class="doc-section">${renderMarkdown(text)}</section>`)
        .join('\n');

      printHtmlDocument(sectionsHtml);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to render PDF.';
      showError(form, msg);
    }
  };
}

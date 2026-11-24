import { readFileAsUint8Array } from '../../io/file-reader';
import { downloadBlob, openBlobInNewTab } from '../../io/download';
import { pdfWorkerClient } from '../../io/pdf-worker-client';
import { showError, clearError } from '../error';

export function renderPdfToMdHtml(): string {
  return `
    <form class="space-y-3">
      <input type="file" name="file" accept=".pdf" required class="block w-full">
      <button type="submit" name="action" value="convert" class="bg-blue-600 text-white px-4 py-2 rounded">Convert</button>
      <button type="submit" name="action" value="download" class="bg-green-600 text-white px-4 py-2 rounded">Download</button>
      <button type="reset" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

export function attachPdfToMdHandlers(form: HTMLFormElement): void {
  const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;

  form.onreset = () => {
    clearError(form);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    clearError(form);

    const file = fileInput.files?.[0];
    if (!file) {
      showError(form, 'Please select a PDF file.');
      return;
    }

    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const isDownload = submitter?.value === 'download';

    try {
      const fileBytes = await readFileAsUint8Array(file);
      const markdownText = await pdfWorkerClient.extractText(fileBytes);
      const blob = new Blob([markdownText], { type: 'text/plain; charset=utf-8' });

      if (isDownload) {
        downloadBlob(blob, 'document.md');
      } else {
        openBlobInNewTab(blob, 'document.md');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract text from PDF.';
      showError(form, msg);
    }
  };
}

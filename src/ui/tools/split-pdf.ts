import { readFileAsUint8Array } from '../../io/file-reader';
import { downloadBlob, openBlobInNewTab, createBlobFromBytes } from '../../io/download';
import { pdfWorkerClient } from '../../io/pdf-worker-client';
import { parseRanges } from '../../core/ranges';
import { showError, clearError } from '../error';

export function renderSplitPdfHtml(): string {
  return `
    <form class="space-y-3">
      <input type="file" name="file" accept=".pdf" required class="block w-full">
      <input name="ranges" placeholder="3-5, 8-10" required class="block w-full border rounded px-2 py-1">
      <button type="submit" name="action" value="convert" class="bg-blue-600 text-white px-4 py-2 rounded">Split</button>
      <button type="submit" name="action" value="download" class="bg-green-600 text-white px-4 py-2 rounded">Download</button>
      <button type="reset" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

export function attachSplitPdfHandlers(form: HTMLFormElement): void {
  const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;
  const rangesInput = form.querySelector('input[name="ranges"]') as HTMLInputElement;

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

    const rangesText = rangesInput.value.trim();
    if (!rangesText) {
      showError(form, 'Please enter page ranges.');
      return;
    }

    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const isDownload = submitter?.value === 'download';

    try {
      const fileBytes = await readFileAsUint8Array(file);
      const totalPages = await pdfWorkerClient.getPageCount(fileBytes);
      const pageIndices = parseRanges(rangesText, totalPages);

      const splitBytes = await pdfWorkerClient.split(fileBytes, pageIndices);
      const blob = createBlobFromBytes(splitBytes, 'application/pdf');

      if (isDownload) {
        downloadBlob(blob, 'split.pdf');
      } else {
        openBlobInNewTab(blob, 'split.pdf');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to split PDF.';
      showError(form, msg);
    }
  };
}

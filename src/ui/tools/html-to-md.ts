import { readFileAsText } from '../../io/file-reader';
import { downloadBlob, createBlobFromBytes } from '../../io/download';
import { convertHtmlToMarkdownFiles } from '../../core/html-to-md';
import { createZipArchive } from '../../core/archive';
import { showError, clearError } from '../error';

export function renderHtmlToMdHtml(): string {
  return `
    <form class="space-y-3">
      <input type="file" name="file" accept=".html" required class="block w-full">
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Convert (ZIP)</button>
      <button type="reset" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

export function attachHtmlToMdHandlers(form: HTMLFormElement): void {
  const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;

  form.onreset = () => {
    clearError(form);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    clearError(form);

    const file = fileInput.files?.[0];
    if (!file) {
      showError(form, 'Please select an HTML file.');
      return;
    }

    try {
      const htmlText = await readFileAsText(file);
      const mdFiles = convertHtmlToMarkdownFiles(htmlText);
      const zipBytes = await createZipArchive(mdFiles);
      const blob = createBlobFromBytes(zipBytes, 'application/zip');

      downloadBlob(blob, 'docs.zip');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert HTML to Markdown.';
      showError(form, msg);
    }
  };
}

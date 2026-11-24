import { readFileAsText } from '../../io/file-reader';
import { downloadBlob, createBlobFromBytes } from '../../io/download';
import { splitMarkdown } from '../../core/markdown';
import { createZipArchive } from '../../core/archive';
import { showError, clearError } from '../error';

export function renderSplitMdHtml(): string {
  return `
    <form class="space-y-3">
      <input type="file" name="file" accept=".md" required class="block w-full">
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Split (ZIP)</button>
      <button type="reset" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

export function attachSplitMdHandlers(form: HTMLFormElement): void {
  const fileInput = form.querySelector('input[name="file"]') as HTMLInputElement;

  form.onreset = () => {
    clearError(form);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    clearError(form);

    const file = fileInput.files?.[0];
    if (!file) {
      showError(form, 'Please select a Markdown file.');
      return;
    }

    try {
      const text = await readFileAsText(file);
      const splitFiles = splitMarkdown(text);

      if (splitFiles.length === 0) {
        showError(form, 'No top-level headings (# Title) found in the file.');
        return;
      }

      const zipBytes = await createZipArchive(splitFiles);
      const blob = createBlobFromBytes(zipBytes, 'application/zip');

      downloadBlob(blob, 'split.zip');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to split Markdown.';
      showError(form, msg);
    }
  };
}

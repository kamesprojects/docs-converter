import { readFileAsText } from '../../io/file-reader';
import { downloadBlob } from '../../io/download';
import { mergeMarkdown } from '../../core/markdown';
import { showError, clearError } from '../error';

export function renderMergeMdHtml(): string {
  return `
    <form class="space-y-3">
      <input type="file" name="files" accept=".md" multiple required class="block w-full">
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Merge</button>
      <button type="reset" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

export function attachMergeMdHandlers(form: HTMLFormElement): void {
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
      const merged = mergeMarkdown(texts);
      const blob = new Blob([merged], { type: 'text/markdown; charset=utf-8' });

      downloadBlob(blob, 'merged.md');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to merge Markdown files.';
      showError(form, msg);
    }
  };
}

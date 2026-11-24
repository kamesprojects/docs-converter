import { readFileAsText } from '../../io/file-reader';
import { downloadBlob, openBlobInNewTab } from '../../io/download';
import { buildMultiDocHtml, DocumentInput } from '../../core/markdown';
import { showError, clearError } from '../error';
import templateHtml from '../../assets/template.html?raw';

export function renderMdToHtmlHtml(): string {
  return `
    <form class="space-y-3">
      <input name="title" placeholder="Title" class="block w-full border rounded px-2 py-1">
      <input type="file" name="files" accept=".md" multiple required class="block w-full">
      <button type="submit" name="action" value="convert" class="bg-blue-600 text-white px-4 py-2 rounded">Convert</button>
      <button type="submit" name="action" value="download" class="bg-green-600 text-white px-4 py-2 rounded">Download</button>
      <button type="reset" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

export function attachMdToHtmlHandlers(form: HTMLFormElement): void {
  const titleInput = form.querySelector('input[name="title"]') as HTMLInputElement;
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

    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const isDownload = submitter?.value === 'download';

    try {
      const docInputs: DocumentInput[] = await Promise.all(
        Array.from(files).map(async (file) => ({
          name: file.name,
          markdown: await readFileAsText(file),
        }))
      );

      const title = titleInput.value.trim() || 'Documents';
      const outputHtml = buildMultiDocHtml(docInputs, title, templateHtml);
      const blob = new Blob([outputHtml], { type: 'text/html; charset=utf-8' });

      if (isDownload) {
        downloadBlob(blob, 'documents.html');
      } else {
        openBlobInNewTab(blob, 'documents.html');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to convert Markdown to HTML.';
      showError(form, msg);
    }
  };
}

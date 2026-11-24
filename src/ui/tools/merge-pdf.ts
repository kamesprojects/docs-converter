import { readFileAsUint8Array } from '../../io/file-reader';
import { downloadBlob, openBlobInNewTab, createBlobFromBytes } from '../../io/download';
import { pdfWorkerClient } from '../../io/pdf-worker-client';
import { showError, clearError } from '../error';

export function renderMergePdfHtml(): string {
  return `
    <form id="merge" class="space-y-3">
      <input id="pick" type="file" accept=".pdf" multiple class="block w-full">
      <ul id="list" class="space-y-1"></ul>
      <input id="files" type="file" name="files" multiple hidden>
      <button type="submit" name="action" value="convert" class="bg-blue-600 text-white px-4 py-2 rounded">Merge</button>
      <button type="submit" name="action" value="download" class="bg-green-600 text-white px-4 py-2 rounded">Download</button>
      <button id="clear-btn" type="button" class="bg-gray-300 px-4 py-2 rounded">Clear</button>
    </form>
  `;
}

export function attachMergePdfHandlers(form: HTMLFormElement): void {
  const pick = form.querySelector('#pick') as HTMLInputElement;
  const list = form.querySelector('#list') as HTMLUListElement;
  const clearBtn = form.querySelector('#clear-btn') as HTMLButtonElement;

  let items: File[] = [];

  const renderItem = (f: File, i: number) => `
    <li class="flex items-center gap-2">
      <span class="flex-1 truncate">${i + 1}. ${f.name}</span>
      <button type="button" data-mv="${i}" data-dir="-1">&uarr;</button>
      <button type="button" data-mv="${i}" data-dir="1">&darr;</button>
      <button type="button" data-rm="${i}" class="text-red-600">&times;</button>
    </li>
  `;

  const draw = () => {
    list.innerHTML = items.map(renderItem).join('');
    list.querySelectorAll<HTMLButtonElement>('[data-mv]').forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.dataset.mv);
        const dir = Number(btn.dataset.dir);
        const j = i + dir;
        if (j < 0 || j >= items.length) return;
        [items[i], items[j]] = [items[j], items[i]];
        draw();
      };
    });
    list.querySelectorAll<HTMLButtonElement>('[data-rm]').forEach((btn) => {
      btn.onclick = () => {
        const i = Number(btn.dataset.rm);
        items.splice(i, 1);
        draw();
      };
    });
  };

  pick.onchange = () => {
    if (pick.files) {
      items.push(...Array.from(pick.files));
      pick.value = '';
      draw();
    }
  };

  clearBtn.onclick = () => {
    items = [];
    clearError(form);
    draw();
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    clearError(form);

    if (items.length === 0) {
      showError(form, 'Please select at least one PDF file.');
      return;
    }

    const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
    const isDownload = submitter?.value === 'download';

    try {
      const buffers = await Promise.all(items.map(readFileAsUint8Array));
      const mergedBytes = await pdfWorkerClient.merge(buffers);
      const blob = createBlobFromBytes(mergedBytes, 'application/pdf');

      if (isDownload) {
        downloadBlob(blob, 'merged.pdf');
      } else {
        openBlobInNewTab(blob, 'merged.pdf');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to merge PDF files.';
      showError(form, msg);
    }
  };
}

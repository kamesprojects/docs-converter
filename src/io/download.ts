export function createBlobFromBytes(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes.buffer as ArrayBuffer], { type });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function openBlobInNewTab(blob: Blob, fallbackFilename: string = 'document'): void {
  const url = URL.createObjectURL(blob);
  const newTab = window.open(url, '_blank');

  if (!newTab) {
    downloadBlob(blob, fallbackFilename);
    return;
  }

  // Allow time for the browser to stream the blob to the new tab before revoking
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}

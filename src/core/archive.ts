import JSZip from 'jszip';

export interface ArchiveEntry {
  filename: string;
  content: string | Uint8Array;
}

export async function createZipArchive(entries: ArchiveEntry[]): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.filename, entry.content);
  }

  const zipData = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return zipData;
}

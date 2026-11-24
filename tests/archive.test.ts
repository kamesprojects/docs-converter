import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { createZipArchive } from '../src/core/archive';

describe('createZipArchive', () => {
  it('creates a valid zip archive containing the given files', async () => {
    const entries = [
      { filename: '01_intro.md', content: '# Intro\n' },
      { filename: '02_outro.md', content: '# Outro\n' },
    ];

    const zipBytes = await createZipArchive(entries);
    expect(zipBytes).toBeInstanceOf(Uint8Array);
    expect(zipBytes.byteLength).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(zipBytes);
    expect(zip.file('01_intro.md')).not.toBeNull();
    expect(zip.file('02_outro.md')).not.toBeNull();

    const introContent = await zip.file('01_intro.md')?.async('string');
    expect(introContent).toBe('# Intro\n');
  });
});

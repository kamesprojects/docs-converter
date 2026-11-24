export function parseRanges(text: string, total: number): number[] {
  if (!text || !text.trim()) {
    throw new Error('Ranges cannot be empty');
  }

  const pages: number[] = [];
  const parts = text.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const dashIndex = trimmed.indexOf('-');
    let startStr: string;
    let endStr: string;

    if (dashIndex !== -1) {
      startStr = trimmed.slice(0, dashIndex).trim();
      endStr = trimmed.slice(dashIndex + 1).trim();
    } else {
      startStr = trimmed;
      endStr = trimmed;
    }

    const start = Number(startStr);
    const end = Number(endStr || startStr);

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      start > end ||
      end > total
    ) {
      throw new Error(`Invalid range: ${trimmed} (PDF has ${total} pages)`);
    }

    for (let i = start - 1; i < end; i++) {
      pages.push(i);
    }
  }

  return pages;
}

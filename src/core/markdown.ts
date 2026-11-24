import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { secureFilename } from './sanitize';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function mergeMarkdown(texts: string[]): string {
  const trimmed = texts.map((t) => t.trim());
  return trimmed.join('\n\n') + '\n';
}

export interface SplitMarkdownFile {
  filename: string;
  content: string;
}

export function splitMarkdown(text: string): SplitMarkdownFile[] {
  const lines = text.split(/\r?\n/);
  const parts: string[][] = [];
  let fence = false;

  for (const line of lines) {
    if (line.startsWith('```')) {
      fence = !fence;
    }

    if (line.startsWith('# ') && !fence) {
      parts.push([line]);
    } else if (parts.length > 0) {
      parts[parts.length - 1].push(line);
    }
  }

  return parts.map((partLines, idx) => {
    const rawTitle = partLines[0].slice(2).trim();
    const safeName = secureFilename(rawTitle) || 'doc';
    const indexStr = String(idx + 1).padStart(2, '0');
    return {
      filename: `${indexStr}_${safeName}.md`,
      content: partLines.join('\n').trim() + '\n',
    };
  });
}

export interface DocumentInput {
  name: string;
  markdown: string;
}

export function renderMarkdown(markdown: string): string {
  const rawHtml = marked.parse(markdown, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
}

export function buildMultiDocHtml(
  docs: DocumentInput[],
  title: string = 'Documents',
  templateHtml: string
): string {
  const safeTitle = escapeHtml(title.trim() || 'Documents');
  const navList: string[] = [];
  const contentList: string[] = [];

  docs.forEach((doc, i) => {
    // Strip file extension if present to match Path(f.filename).stem
    const stem = doc.name.replace(/\.[^/.]+$/, '');
    const body = renderMarkdown(doc.markdown);

    navList.push(`<a href="#doc-${i}">${escapeHtml(stem)}</a>`);
    contentList.push(`<section class="doc" id="doc-${i}">${body}</section>`);
  });

  const replacements: Record<string, string> = {
    TITLE: safeTitle,
    NAV: navList.join('\n'),
    CONTENT: contentList.join('\n'),
  };

  return templateHtml.replace(/\{\{(TITLE|NAV|CONTENT)\}\}/g, (_, key: string) => {
    return replacements[key] ?? '';
  });
}

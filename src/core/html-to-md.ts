import TurndownService from 'turndown';
import { secureFilename } from './sanitize';

export interface ConvertedMarkdownFile {
  filename: string;
  content: string;
}

export function convertHtmlToMarkdownFiles(
  html: string,
  parseDocument: (html: string) => Document = (content) =>
    new DOMParser().parseFromString(content, 'text/html')
): ConvertedMarkdownFile[] {
  const doc = parseDocument(html);
  const sections = Array.from(doc.querySelectorAll('section.doc'));
  const targetElements: Element[] =
    sections.length > 0 ? sections : [doc.body || doc.documentElement];

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  return targetElements.map((section, idx) => {
    let name = 'doc';
    const sectionId = section.getAttribute('id');
    if (sectionId) {
      const link = doc.querySelector(`nav a[href="#${sectionId}"]`);
      if (link && link.textContent) {
        const safe = secureFilename(link.textContent.trim());
        if (safe) {
          name = safe;
        }
      }
    }

    const markdownText = turndown.turndown(section.innerHTML).trim() + '\n';
    const indexStr = String(idx + 1).padStart(2, '0');

    return {
      filename: `${indexStr}_${name}.md`,
      content: markdownText,
    };
  });
}

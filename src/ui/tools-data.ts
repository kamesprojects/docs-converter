export interface ToolDef {
  slug: string;
  name: string;
  tags: string;
  desc: string;
}

export const TOOLS: ToolDef[] = [
  { slug: 'merge', name: 'Merge PDF', tags: 'pdf', desc: 'Combine PDFs in a chosen order' },
  { slug: 'split', name: 'Split PDF', tags: 'pdf', desc: 'Extract page ranges' },
  { slug: 'pdf-to-md', name: 'PDF to Markdown', tags: 'pdf md', desc: 'Extract text as Markdown' },
  { slug: 'md-to-html', name: 'MD to HTML', tags: 'md html', desc: 'Build one HTML from MD files' },
  { slug: 'html-to-md', name: 'HTML to MD', tags: 'html md', desc: 'Split HTML into MD files' },
  { slug: 'merge-md', name: 'Merge MD', tags: 'md', desc: 'Combine MD files into one' },
  { slug: 'split-md', name: 'Split MD', tags: 'md', desc: 'Split one MD by # titles' },
  { slug: 'md-to-pdf', name: 'MD to PDF', tags: 'md pdf', desc: 'Render MD files as one PDF' },
];

import { describe, it, expect } from 'vitest';
import { convertHtmlToMarkdownFiles } from '../src/core/html-to-md';

describe('convertHtmlToMarkdownFiles', () => {
  it('converts multi-section HTML into markdown files matching nav links', () => {
    const html = `
      <!doctype html>
      <html>
        <head><title>Docs</title></head>
        <body>
          <nav>
            <a href="#doc-0">Introduction</a>
            <a href="#doc-1">API Reference</a>
          </nav>
          <main>
            <section class="doc" id="doc-0">
              <h1>Intro</h1>
              <p>Welcome to the docs.</p>
            </section>
            <section class="doc" id="doc-1">
              <h1>API</h1>
              <p>Endpoints listed here.</p>
            </section>
          </main>
        </body>
      </html>
    `;

    const result = convertHtmlToMarkdownFiles(html);

    expect(result).toHaveLength(2);
    expect(result[0].filename).toBe('01_Introduction.md');
    expect(result[0].content).toContain('# Intro');
    expect(result[0].content).toContain('Welcome to the docs.');

    expect(result[1].filename).toBe('02_API_Reference.md');
    expect(result[1].content).toContain('# API');
    expect(result[1].content).toContain('Endpoints listed here.');
  });

  it('converts document without sections into a single markdown file', () => {
    const html = `
      <html>
        <body>
          <h1>Simple Page</h1>
          <p>Just one paragraph.</p>
        </body>
      </html>
    `;

    const result = convertHtmlToMarkdownFiles(html);

    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('01_doc.md');
    expect(result[0].content).toContain('# Simple Page');
  });
});

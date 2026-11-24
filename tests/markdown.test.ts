import { describe, it, expect } from 'vitest';
import {
  mergeMarkdown,
  splitMarkdown,
  renderMarkdown,
  buildMultiDocHtml,
  escapeHtml,
} from '../src/core/markdown';

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('<script>alert("1" & \'2\')</script>')).toBe(
      '&lt;script&gt;alert(&quot;1&quot; &amp; &#39;2&#39;)&lt;/script&gt;'
    );
  });
});

describe('mergeMarkdown', () => {
  it('joins multiple markdown documents with double newlines', () => {
    const input = ['# Doc 1\nContent 1', '# Doc 2\nContent 2'];
    const expected = '# Doc 1\nContent 1\n\n# Doc 2\nContent 2\n';
    expect(mergeMarkdown(input)).toBe(expected);
  });

  it('trims leading/trailing whitespace before joining', () => {
    const input = ['  # Doc 1\nContent 1  ', '\n# Doc 2\nContent 2\n'];
    const expected = '# Doc 1\nContent 1\n\n# Doc 2\nContent 2\n';
    expect(mergeMarkdown(input)).toBe(expected);
  });
});

describe('splitMarkdown', () => {
  it('splits markdown by top-level # titles', () => {
    const md = `# First\nSome text\n# Second Title\nMore text`;
    const result = splitMarkdown(md);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      filename: '01_First.md',
      content: '# First\nSome text\n',
    });
    expect(result[1]).toEqual({
      filename: '02_Second_Title.md',
      content: '# Second Title\nMore text\n',
    });
  });

  it('ignores # inside fenced code blocks', () => {
    const md = `# Main\n\`\`\`python\n# inside comment\n\`\`\`\nMore text\n# Next\nEnd`;
    const result = splitMarkdown(md);

    expect(result).toHaveLength(2);
    expect(result[0].filename).toBe('01_Main.md');
    expect(result[0].content).toContain('# inside comment');
    expect(result[1].filename).toBe('02_Next.md');
  });

  it('drops text before the first # title', () => {
    const md = `Ignored preamble text\n# Actual Title\nBody`;
    const result = splitMarkdown(md);

    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe('01_Actual_Title.md');
    expect(result[0].content).toBe('# Actual Title\nBody\n');
  });
});

describe('renderMarkdown', () => {
  it('renders markdown to sanitized HTML', () => {
    const md = '# Title\n\n**Bold** and <script>alert("XSS")</script>';
    const html = renderMarkdown(md);

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).not.toContain('<script>');
  });
});

describe('buildMultiDocHtml', () => {
  it('replaces tokens in template correctly', () => {
    const template = '<html><head><title>{{TITLE}}</title></head><body><nav>{{NAV}}</nav><main>{{CONTENT}}</main></body></html>';
    const docs = [
      { name: 'intro.md', markdown: '# Welcome\nHello' },
      { name: 'guide.md', markdown: '# Setup\nSteps' },
    ];

    const result = buildMultiDocHtml(docs, 'My Docs', template);

    expect(result).toContain('<title>My Docs</title>');
    expect(result).toContain('<a href="#doc-0">intro</a>');
    expect(result).toContain('<a href="#doc-1">guide</a>');
    expect(result).toContain('<section class="doc" id="doc-0"><h1>Welcome</h1>\n<p>Hello</p>\n</section>');
    expect(result).toContain('<section class="doc" id="doc-1"><h1>Setup</h1>\n<p>Steps</p>\n</section>');
  });
});

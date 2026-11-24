import { describe, it, expect } from 'vitest';
import { secureFilename } from '../src/core/sanitize';

describe('secureFilename', () => {
  it('converts spaces to underscores', () => {
    expect(secureFilename('My Document.pdf')).toBe('My_Document.pdf');
  });

  it('removes unsafe characters and path traversal', () => {
    expect(secureFilename('../../etc/passwd')).toBe('etc_passwd');
  });

  it('normalizes diacritics', () => {
    expect(secureFilename('príručka používateľa.md')).toBe('prirucka_pouzivatela.md');
  });

  it('strips leading and trailing dots and underscores', () => {
    expect(secureFilename('...test_name__')).toBe('test_name');
  });

  it('handles empty or special character only string', () => {
    expect(secureFilename('???///')).toBe('');
  });
});

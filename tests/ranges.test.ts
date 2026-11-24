import { describe, it, expect } from 'vitest';
import { parseRanges } from '../src/core/ranges';

describe('parseRanges', () => {
  it('parses single page numbers', () => {
    expect(parseRanges('1, 3, 5', 10)).toEqual([0, 2, 4]);
  });

  it('parses page ranges', () => {
    expect(parseRanges('1-3, 5-6', 10)).toEqual([0, 1, 2, 4, 5]);
  });

  it('handles spaces and mixed formats', () => {
    expect(parseRanges(' 3-5 , 8 ', 10)).toEqual([2, 3, 4, 7]);
  });

  it('throws an error when start is less than 1', () => {
    expect(() => parseRanges('0-3', 10)).toThrow('Invalid range: 0-3 (PDF has 10 pages)');
  });

  it('throws an error when end exceeds total', () => {
    expect(() => parseRanges('3-12', 10)).toThrow('Invalid range: 3-12 (PDF has 10 pages)');
  });

  it('throws an error when start > end', () => {
    expect(() => parseRanges('5-3', 10)).toThrow('Invalid range: 5-3 (PDF has 10 pages)');
  });

  it('throws an error for non-numeric input', () => {
    expect(() => parseRanges('abc', 10)).toThrow('Invalid range: abc (PDF has 10 pages)');
  });

  it('throws an error for empty text', () => {
    expect(() => parseRanges('', 10)).toThrow('Ranges cannot be empty');
  });
});

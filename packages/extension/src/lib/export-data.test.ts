import { describe, it, expect } from 'vitest';
import { escapeCsv } from './export-data';

describe('escapeCsv', () => {
    it('leaves numbers and plain text alone', () => {
        expect(escapeCsv(12.5)).toBe('12.5');
        expect(escapeCsv(-3)).toBe('-3');
        expect(escapeCsv('BOM')).toBe('BOM');
        expect(escapeCsv(undefined)).toBe('');
    });
    it('quotes commas, quotes and both line endings', () => {
        expect(escapeCsv('a,b')).toBe('"a,b"');
        expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
        expect(escapeCsv('a\rb')).toBe('"a\rb"');
    });
    it('defuses formula-leading text (#78)', () => {
        expect(escapeCsv('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
        expect(escapeCsv('@SUM(A1)')).toBe("'@SUM(A1)");
    });
});

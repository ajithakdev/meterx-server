import { describe, it, expect } from 'vitest';
import { validateServerUrl, normalizeServerUrl } from './browser';

describe('validateServerUrl', () => {
    it.each(['https://speed.example.com', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://nas.local'])('accepts %s', (u) => {
        expect(validateServerUrl(u)).toBeNull();
    });
    it.each(['http://speed.example.com', 'ftp://x.test', 'not a url', ''])('rejects %s', (u) => {
        expect(validateServerUrl(u)).toEqual(expect.any(String));
    });
});

describe('normalizeServerUrl', () => {
    it('drops trailing slashes, query and hash (#68)', () => {
        expect(normalizeServerUrl('https://host.test/')).toBe('https://host.test');
        expect(normalizeServerUrl(' https://host.test/meterx//?a=1#x ')).toBe('https://host.test/meterx');
    });
});

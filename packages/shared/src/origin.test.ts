import { describe, it, expect } from 'vitest';
import { isAllowedOrigin } from './index';

describe('isAllowedOrigin', () => {
    it('allows extensions, the site and its local dev server', () => {
        expect(isAllowedOrigin('chrome-extension://abcdefghijklmnop')).toBe(true);
        expect(isAllowedOrigin('moz-extension://1234-5678')).toBe(true);
        expect(isAllowedOrigin('https://meterx.ajithakdev.com')).toBe(true);
        expect(isAllowedOrigin('http://localhost:8788')).toBe(true);
    });
    it('refuses other sites, look-alikes and null', () => {
        expect(isAllowedOrigin('https://evil.example')).toBe(false);
        expect(isAllowedOrigin('https://meterx.ajithakdev.com.evil.example')).toBe(false);
        expect(isAllowedOrigin('http://meterx.ajithakdev.com')).toBe(false);
        expect(isAllowedOrigin('http://localhost.evil.example:80')).toBe(false);
        expect(isAllowedOrigin('null')).toBe(false);
        expect(isAllowedOrigin(null)).toBe(false);
    });
});

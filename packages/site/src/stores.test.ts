import { describe, it, expect } from 'vitest';
import { detectStore } from './stores';

describe('detectStore', () => {
    it('tells the browsers apart, Edge and Opera before Chrome', () => {
        expect(detectStore('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe('firefox');
        expect(detectStore('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('edge');
        expect(detectStore('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 OPR/114.0')).toBe('opera');
        expect(detectStore('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36')).toBe('chrome');
        expect(detectStore('Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1')).toBeNull();
    });
});

import { describe, it, expect } from 'vitest';
import { toContributors, toIssues } from './github';

describe('toIssues', () => {
    it('keeps issues, drops pull requests and junk', () => {
        const raw = [
            { number: 22, title: 'Reduced motion', html_url: 'u', labels: [{ name: 'good first issue' }] },
            { number: 9, title: 'A PR', html_url: 'p', pull_request: {}, labels: [] },
            null,
        ];
        expect(toIssues(raw)).toEqual([{ number: 22, title: 'Reduced motion', url: 'u', labels: ['good first issue'] }]);
        expect(toIssues({ message: 'rate limited' })).toEqual([]);
        expect(toIssues([{ number: 1, title: 'Export \u2014 add HTML', html_url: 'u', labels: [] }])[0].title).toBe('Export, add HTML');
    });
});

describe('toContributors', () => {
    it('keeps people and drops bots', () => {
        const raw = [{ login: 'ajithakdev', type: 'User', avatar_url: 'a?v=4', html_url: 'h', contributions: 120 }, { login: 'dependabot[bot]', type: 'Bot' }];
        expect(toContributors(raw)).toEqual([{ login: 'ajithakdev', avatar: 'a?v=4&s=96', url: 'h', contributions: 120 }]);
    });
});

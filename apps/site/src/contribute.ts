/**
 * Contribute page: live repo stats, issues ready for newcomers, and everyone who has contributed.
 * Without the API (offline, rate limited) the page keeps its plain links.
 * @license AGPL-3.0
 */

import { REPO, gh, toContributors, toIssues } from './github';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const n = (v: number) => v.toLocaleString();

gh<{ stargazers_count: number; forks_count: number; open_issues_count: number }>(`repos/${REPO}`).then(r => {
    $('stStars').textContent = n(r.stargazers_count);
    $('stForks').textContent = n(r.forks_count);
    $('stIssues').textContent = n(r.open_issues_count);
    $('stats').classList.add('is-live');
}).catch(() => { /* the stat cells keep their links */ });

Promise.all([
    gh<unknown>(`repos/${REPO}/issues?state=open&labels=good%20first%20issue&per_page=8`),
    gh<unknown>(`repos/${REPO}/issues?state=open&labels=help%20wanted&per_page=8`),
]).then(([first, help]) => {
    const seen = new Set<number>();
    const all = [...toIssues(first), ...toIssues(help)].filter(i => !seen.has(i.number) && seen.add(i.number));
    if (!all.length) return;
    $('issues').innerHTML = all.map(i => `<li><a href="${esc(i.url)}">
      <span class="num">#${i.number}</span><span class="t">${esc(i.title)}</span>
      <span class="tags">${i.labels.filter(l => l !== 'enhancement' && l !== 'documentation').map(l => `<span class="pill${l === 'good first issue' ? ' s-good' : l === 'help wanted' ? ' s-okay' : ''}">${esc(l)}</span>`).join('')}</span>
    </a></li>`).join('');
}).catch(() => { /* keeps the link to the issue list */ });

gh<unknown>(`repos/${REPO}/contributors?per_page=60`).then(raw => {
    const people = toContributors(raw);
    if (!people.length) return;
    $('people').innerHTML = people.map(p => `<li><a href="${esc(p.url)}" title="${esc(p.login)}: ${p.contributions} contributions">
      <img src="${esc(p.avatar)}" alt="" width="48" height="48" loading="lazy"><span>${esc(p.login)}</span><span class="small">${n(p.contributions)} commits</span></a></li>`).join('')
      + `<li class="you"><a href="#start"><span class="slot" aria-hidden="true">+</span><span>You?</span><span class="small">Start below</span></a></li>`;
}).catch(() => { /* keeps the link to the contributors graph */ });

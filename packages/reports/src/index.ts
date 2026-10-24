/**
 * Reports built from MeterX results: the PDF, CSV and JSON exports and their summary stats.
 * Pure: no browser-extension APIs, so the extension and the site can both use them.
 * @license AGPL-3.0
 */

export { buildReport, reportId, niceMax } from './pdf';
export { COLUMNS, toCsv, toJson, escapeCsv } from './data';
export { summarize, consistency, trendPercent, type Summary, type Spread } from './stats';

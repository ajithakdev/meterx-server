/**
 * PDF download: reads the saved plan, builds the report with @meterx/reports, saves it.
 * @license AGPL-3.0
 */

import { localDate, type HistoryEntry } from '@meterx/shared';
import { buildReport } from '@meterx/reports';
import { loadIspPlan } from './isp';

export async function exportPdfReport(hist: HistoryEntry[]): Promise<void> {
    if (hist.length === 0) throw new Error('No data to export');
    const plan = await loadIspPlan().catch(() => null);
    const doc = await buildReport(hist, plan);
    doc.save(`meterx-report-${localDate()}.pdf`);
}

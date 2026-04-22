/**
 * PDF report generation — heavy imports (html2canvas, jspdf) loaded on demand.
 * @license AGPL-3.0
 */

import type { HistoryEntry } from '@meterx/shared';
import { getQuality } from './quality';

interface ConnInfo { type?: string; effectiveType?: string }

export async function exportPdfReport(hist: HistoryEntry[]): Promise<void> {
    if (hist.length === 0) throw new Error('No data to export');

    const avg = (a: number[]) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
    const mn = (a: number[]) => a.length ? Math.min(...a) : 0;
    const mx = (a: number[]) => a.length ? Math.max(...a) : 0;
    const sd = (a: number[]) => { const m = avg(a); return Math.sqrt(avg(a.map(v => (v - m) ** 2))); };

    const dlV = hist.filter(e => e.downloadSpeed !== undefined).map(e => e.downloadSpeed!);
    const ulV = hist.filter(e => e.uploadSpeed !== undefined).map(e => e.uploadSpeed!);
    const piV = hist.filter(e => e.ping !== undefined).map(e => e.ping!);
    const jiV = hist.filter(e => e.jitter !== undefined).map(e => e.jitter!);
    const loV = hist.filter(e => e.packetLoss !== undefined).map(e => e.packetLoss!);

    const aDl = avg(dlV), aUl = avg(ulV), aPi = avg(piV), aJi = avg(jiV), aLo = avg(loV);
    const qual = getQuality(aDl, aUl, aPi);
    const cons = dlV.length > 1 ? Math.max(0, Math.min(100, 100 - (sd(dlV) / aDl) * 100)) : 100;
    const consLabel = cons >= 85 ? 'Stable' : cons >= 70 ? 'Moderate' : cons >= 50 ? 'Unstable' : 'Very unstable';
    const anomThresh = aDl * 0.5;
    const anomCount = dlV.filter(v => v < anomThresh).length;
    const halfIdx = Math.floor(dlV.length / 2);
    const trendPct = avg(dlV.slice(halfIdx)) > 0 ? ((avg(dlV.slice(0, halfIdx)) - avg(dlV.slice(halfIdx))) / avg(dlV.slice(halfIdx))) * 100 : 0;
    const trendLabel = Math.abs(trendPct) < 5 ? 'Stable' : trendPct > 0 ? `Improving (+${trendPct.toFixed(0)}%)` : `Declining (${trendPct.toFixed(0)}%)`;

    const now = new Date();
    const oldest = new Date(hist[hist.length - 1].timestamp);
    const newest = new Date(hist[0].timestamp);
    const spanMin = Math.floor((newest.getTime() - oldest.getTime()) / 60000);
    const period = spanMin < 60 ? `${spanMin} min session` : spanMin < 1440 ? `${Math.floor(spanMin / 60)} hour session` : `${Math.floor(spanMin / 1440)} days`;

    const qCol = qual.cls === 'excellent' ? '#34d399' : qual.cls === 'good' ? '#60a5fa' : qual.cls === 'fair' ? '#fbbf24' : '#f87171';
    const consCol = cons >= 85 ? '#34d399' : cons >= 70 ? '#fbbf24' : '#f87171';
    const trendCol = Math.abs(trendPct) < 5 ? '#8888a0' : trendPct > 0 ? '#34d399' : '#f87171';

    const conn = (navigator as unknown as { connection?: ConnInfo }).connection;
    const envParts: string[] = [];
    if (conn?.type && conn.type !== 'unknown') envParts.push(`Connection: ${({ wifi: 'WiFi', ethernet: 'Ethernet', cellular: 'Cellular' } as Record<string, string>)[conn.type] || conn.type}`);
    if (conn?.effectiveType) envParts.push(`Speed tier: ${conn.effectiveType.toUpperCase()}`);

    const gamSub = aPi < 50 ? 'Competitive OK' : aPi < 100 ? 'Casual only' : 'Not recommended';
    const ucData = [
        { l: 'Video Calls', s: 'Zoom, Meet, Teams', sc: (aDl >= 5 && aUl >= 3 && aPi < 100 && aJi < 30) ? 'Good' : (aDl >= 2 && aUl >= 1) ? 'Moderate' : 'Poor' },
        { l: '4K Streaming', s: 'Netflix, YouTube', sc: aDl >= 25 ? 'Good' : aDl >= 5 ? 'HD only' : 'Poor' },
        { l: 'Gaming', s: gamSub, sc: (aPi < 50 && aJi < 20 && aLo < 1) ? 'Good' : aPi < 100 ? 'Moderate' : 'Poor' },
        { l: 'Uploads', s: 'Cloud sync, files', sc: aUl >= 10 ? 'Good' : aUl >= 3 ? 'Moderate' : 'Poor' },
    ];

    const ucColor = (sc: string) => sc === 'Good' ? '#34d399' : sc === 'Poor' ? '#f87171' : '#fbbf24';
    const ucBg = (sc: string) => sc === 'Good' ? '#0d1f17' : sc === 'Poor' ? '#1f0d0d' : '#1f1a0d';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>MeterX Network Health Report</title>
<style>
@media print {
  @page { size: A4; margin: 12mm; }
  body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0c0c14; color: #e8e8e8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; line-height: 1.5; padding: 32px; min-height: 100vh; }
.accent-bar { height: 4px; background: linear-gradient(90deg, #00c8ff, #a855f7); border-radius: 2px; margin-bottom: 24px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.header h1 { font-size: 22px; color: #00c8ff; font-weight: 700; }
.header .meta { text-align: right; color: #555570; font-size: 10px; }
.card { background: #151520; border: 1px solid #1e1e2e; border-radius: 10px; padding: 20px; margin-bottom: 16px; }
.quality-hero { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.quality-hero .qlabel { font-size: 36px; font-weight: 800; }
.quality-hero .qsub { color: #8888a0; font-size: 12px; margin-top: 4px; }
.quality-hero .right { text-align: right; font-size: 10px; line-height: 1.8; }
.env { color: #555570; font-size: 10px; margin-bottom: 12px; }
.divider { border: none; border-top: 1px solid #1e1e2e; margin: 16px 0; }
.metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
.metric-card { background: #151520; border: 1px solid #1e1e2e; border-radius: 8px; padding: 16px; }
.metric-card .lbl { color: #555570; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
.metric-card .val { font-size: 32px; font-weight: 800; line-height: 1.1; }
.metric-card .unit { color: #8888a0; font-size: 12px; margin-top: 4px; }
.metric-card .range { color: #555570; font-size: 9px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #1e1e2e; }
.sec-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.sec-card { background: #151520; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
.sec-card .lbl { color: #555570; font-size: 9px; text-transform: uppercase; }
.sec-card .val { font-size: 16px; font-weight: 700; color: #e8e8e8; }
.sec-card .range { color: #555570; font-size: 9px; }
.sec-card .no-loss { color: #34d399; font-size: 9px; font-weight: 600; }
h2 { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #e8e8e8; }
.uc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.uc-card { border-radius: 8px; padding: 14px; border: 1px solid; }
.uc-card .name { font-size: 9px; color: #8888a0; margin-bottom: 6px; }
.uc-card .score { font-size: 16px; font-weight: 700; }
.uc-card .sub { font-size: 8px; color: #555570; margin-top: 6px; }
table { width: 100%; border-collapse: collapse; font-size: 10px; }
thead th { background: #16162a; color: #00c8ff; font-size: 8px; font-weight: 700; letter-spacing: 0.04em; padding: 8px 10px; text-align: left; }
thead th:first-child { border-radius: 6px 0 0 6px; }
thead th:last-child { border-radius: 0 6px 6px 0; }
tbody tr { border-bottom: 1px solid #1a1a2a; }
tbody tr:nth-child(even) { background: #10101c; }
tbody tr.anomaly { background: #140a0a; }
tbody tr.anomaly td:first-child { border-left: 2px solid #f87171; padding-left: 8px; }
tbody td { padding: 6px 10px; color: #8888a0; }
.dl { color: #00c8ff; } .ul { color: #a855f7; } .pi { color: #34d399; }
.anom-dl { color: #f87171 !important; } .anom-dt { color: #ff6b6b !important; }
.badge-anom { background: #f87171; color: #fff; font-size: 8px; font-weight: 700; padding: 2px 8px; border-radius: 4px; display: inline-block; }
.watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(35deg); font-size: 100px; font-weight: 800; color: rgba(255,255,255,0.015); pointer-events: none; z-index: -1; letter-spacing: 0.1em; }
</style></head><body>
<div class="watermark">MeterX</div>
<div class="accent-bar"></div>

<div class="header">
  <h1>Network Health Report</h1>
  <div class="meta">
    ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}<br>
    ${period} &middot; ${hist.length} tests
  </div>
</div>

<div class="card">
  <div class="quality-hero">
    <div>
      <div class="qlabel" style="color:${qCol}">${qual.label}</div>
      <div class="qsub">Network Quality</div>
    </div>
    <div class="right">
      <div style="color:${consCol};font-weight:700">${cons.toFixed(0)}% stable (${consLabel})</div>
      <div style="color:#555570">Based on download speed variation</div>
      <div style="color:${trendCol}">Trend: ${trendLabel}</div>
      ${anomCount > 0
        ? `<div style="color:#f87171;font-weight:700">${anomCount} anomal${anomCount === 1 ? 'y' : 'ies'} &mdash; DL dropped below ${anomThresh.toFixed(0)} Mbps</div>`
        : '<div style="color:#34d399">No anomalies detected</div>'}
    </div>
  </div>
</div>

${envParts.length > 0 ? `<div class="env">${envParts.join(' &middot; ')}</div>` : ''}

<hr class="divider">
<div class="metrics">
  ${[{ l: 'Download', a: aDl, lo: mn(dlV), hi: mx(dlV), u: 'Mbps', c: '#00c8ff' },
       { l: 'Upload', a: aUl, lo: mn(ulV), hi: mx(ulV), u: 'Mbps', c: '#a855f7' },
       { l: 'Ping', a: aPi, lo: mn(piV), hi: mx(piV), u: 'ms', c: '#34d399' }]
        .map(m => `<div class="metric-card">
      <div class="lbl">${m.l}</div>
      <div class="val" style="color:${m.c}">${m.a.toFixed(1)}</div>
      <div class="unit">${m.u}</div>
      <div class="range">Range: ${m.lo.toFixed(1)} &ndash; ${m.hi.toFixed(1)}</div>
    </div>`).join('')}
</div>

<div class="sec-metrics">
  <div class="sec-card">
    <div><div class="lbl">Jitter</div><div class="val">${aJi.toFixed(1)} ms</div></div>
    <div class="range">Range: ${mn(jiV).toFixed(1)} &ndash; ${mx(jiV).toFixed(1)}</div>
  </div>
  <div class="sec-card">
    <div><div class="lbl">Packet Loss</div><div class="val">${aLo.toFixed(1)} %</div></div>
    ${mn(loV) === mx(loV) && aLo === 0 ? '<div class="no-loss">No loss detected</div>' : `<div class="range">Range: ${mn(loV).toFixed(1)} &ndash; ${mx(loV).toFixed(1)}</div>`}
  </div>
</div>

<hr class="divider">
<h2>Use-Case Assessment</h2>
<div class="uc-grid">
  ${ucData.map(c => `<div class="uc-card" style="background:${ucBg(c.sc)};border-color:${ucColor(c.sc)}">
    <div class="name">${c.l}</div>
    <div class="score" style="color:${ucColor(c.sc)}">${c.sc}</div>
    <div class="sub">${c.s}</div>
  </div>`).join('')}
</div>

<hr class="divider">
<h2>Test History</h2>
<table>
  <thead><tr><th>Date / Time</th><th>DL (Mbps)</th><th>UL (Mbps)</th><th>Ping (ms)</th><th>Jitter (ms)</th><th>Loss (%)</th><th></th></tr></thead>
  <tbody>
    ${hist.map(e => {
        const d = new Date(e.timestamp);
        const dt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        const isA = e.downloadSpeed !== undefined && e.downloadSpeed < anomThresh;
        return `<tr class="${isA ? 'anomaly' : ''}">
      <td class="${isA ? 'anom-dt' : ''}">${dt}</td>
      <td class="${isA ? 'anom-dl' : 'dl'}">${e.downloadSpeed !== undefined ? e.downloadSpeed.toFixed(1) : '-'}</td>
      <td class="ul">${e.uploadSpeed !== undefined ? e.uploadSpeed.toFixed(1) : '-'}</td>
      <td class="pi">${e.ping !== undefined ? e.ping.toFixed(1) : '-'}</td>
      <td>${e.jitter !== undefined ? e.jitter.toFixed(1) : '-'}</td>
      <td>${e.packetLoss !== undefined ? e.packetLoss.toFixed(0) : '-'}</td>
      <td>${isA ? '<span class="badge-anom">ANOMALY</span>' : ''}</td>
    </tr>`;
    }).join('')}
  </tbody>
</table>

</body></html>`;

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;visibility:visible;';
    container.innerHTML = html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '');

    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (styleMatch) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styleMatch[1];
        container.prepend(styleEl);
    }
    container.style.background = '#0c0c14';
    container.style.padding = '30px 40px';
    container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    container.style.fontSize = '11px';
    container.style.lineHeight = '1.5';
    container.style.color = '#e8e8e8';

    document.body.appendChild(container);

    try {
        const { default: html2canvas } = await import('html2canvas');
        const { jsPDF } = await import('jspdf');

        const canvas = await html2canvas(container, {
            backgroundColor: '#0c0c14',
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            foreignObjectRendering: false,
        });

        const pdfW = 210, pdfH = 297, margin = 8;
        const contentW = pdfW - margin * 2;
        const footerH = 12, contHeaderH = 10;
        const page1ContentH = pdfH - margin * 2 - footerH;
        const pageNContentH = pdfH - margin * 2 - footerH - contHeaderH;
        const scaleFactor = canvas.width / contentW;
        const slice1H = page1ContentH * scaleFactor;
        const sliceNH = pageNContentH * scaleFactor;

        let remaining = canvas.height - slice1H;
        let totalPages = 1;
        while (remaining > 0) { totalPages++; remaining -= sliceNH; }

        const doc = new jsPDF('p', 'mm', 'a4');
        let srcOffset = 0;
        for (let p = 0; p < totalPages; p++) {
            if (p > 0) doc.addPage();
            doc.setFillColor('#0c0c14');
            doc.rect(0, 0, pdfW, pdfH, 'F');

            const isFirst = p === 0;
            const maxSlice = isFirst ? slice1H : sliceNH;
            const topOffset = isFirst ? margin : margin + contHeaderH;
            const srcH = Math.min(maxSlice, canvas.height - srcOffset);
            const destH = srcH / scaleFactor;

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = srcH;
            const ctx = pageCanvas.getContext('2d')!;
            ctx.fillStyle = '#0c0c14';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(canvas, 0, srcOffset, canvas.width, srcH, 0, 0, canvas.width, srcH);

            doc.addImage(
                pageCanvas.toDataURL('image/png'),
                'PNG', margin, topOffset, contentW, destH,
                undefined, 'FAST'
            );
            srcOffset += srcH;
        }

        const footerY = pdfH - margin - 4;
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setDrawColor('#1e1e2e');
            doc.line(margin, footerY - 4, pdfW - margin, footerY - 4);
            doc.setFontSize(7);
            doc.setTextColor('#555570');
            doc.text('github.com/ajithakdev/meterx-server  |  v2026.0.319  |  AGPL-3.0', pdfW / 2, footerY, { align: 'center' });
            doc.setTextColor('#8888a0');
            doc.text(`${p} / ${totalPages}`, pdfW - margin, footerY, { align: 'right' });
            if (p > 1) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor('#e8e8e8');
                doc.text('Test History (continued)', margin, margin + 6);
                doc.setFont('helvetica', 'normal');
            }
        }

        doc.save(`MeterX-Report-${now.toLocaleDateString('en-CA')}.pdf`);
    } finally {
        document.body.removeChild(container);
    }
}

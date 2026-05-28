/**
 * PNG scorecard export for social media sharing.
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */

import type { HistoryEntry } from '@meterx/shared';
import { getQuality } from './quality';

export async function exportPngScorecard(entry: HistoryEntry): Promise<void> {
    if (!entry.downloadSpeed && !entry.uploadSpeed && !entry.ping) {
        throw new Error('No metrics to export');
    }

    const qual = getQuality(
        entry.downloadSpeed || 0,
        entry.uploadSpeed || 0,
        entry.ping || 0
    );
    const qCol = {
        excellent: '#34d399',
        good: '#60a5fa',
        fair: '#fbbf24',
        poor: '#f87171',
    }[qual.cls];

    const now = new Date(entry.timestamp || Date.now());
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Build HTML scorecard (1200x630 canvas for social media) - Modern design
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>MeterX Scorecard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    width: 1200px; height: 630px;
    background: radial-gradient(ellipse at top left, #1a1a2e 0%, #0c0c14 50%, #16131d 100%);
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}
.glow-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;
}
.orb1 { width: 400px; height: 400px; background: #00c8ff; top: -150px; left: -150px; }
.orb2 { width: 350px; height: 350px; background: #a855f7; bottom: -120px; right: -120px; }
.orb3 { width: 300px; height: 300px; background: #34d399; top: 50%; right: 10%; transform: translateY(-50%); }
.container {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: 60px 80px;
    display: flex;
    flex-direction: column;
    gap: 50px;
}
.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.brand {
    display: flex;
    align-items: center;
    gap: 16px;
}
.logo-box {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #00c8ff 0%, #a855f7 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 900;
    color: #fff;
    box-shadow: 0 8px 32px rgba(0,200,255,0.3);
}
.brand-name {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.5px;
}
.quality-badge {
    padding: 12px 32px;
    border-radius: 100px;
    font-size: 24px;
    font-weight: 700;
    background: ${qCol}20;
    color: ${qCol};
    border: 2px solid ${qCol};
    box-shadow: 0 0 32px ${qCol}40;
}
.metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    margin: 0 40px;
}
.metric-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 40px 30px;
    text-align: center;
    position: relative;
    overflow: hidden;
}
.metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
}
.metric-card.dl::before { background: linear-gradient(90deg, #00c8ff, #0088cc); }
.metric-card.ul::before { background: linear-gradient(90deg, #a855f7, #8b45d4); }
.metric-card.pi::before { background: linear-gradient(90deg, #34d399, #10b981); }
.metric-icon {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    opacity: 0.5;
    margin-bottom: 16px;
}
.metric-value {
    font-size: 68px;
    font-weight: 900;
    line-height: 1;
    margin-bottom: 12px;
    background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.metric-card.dl .metric-value { background: linear-gradient(135deg, #00c8ff 0%, #0088cc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.metric-card.ul .metric-value { background: linear-gradient(135deg, #a855f7 0%, #8b45d4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.metric-card.pi .metric-value { background: linear-gradient(135deg, #34d399 0%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.metric-unit {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255,255,255,0.4);
}
.footer {
    text-align: center;
    font-size: 15px;
    color: rgba(255,255,255,0.3);
    letter-spacing: 0.5px;
}
.footer-link {
    color: rgba(0,200,255,0.6);
    text-decoration: none;
}
</style></head><body>
<div class="glow-orb orb1"></div>
<div class="glow-orb orb2"></div>
<div class="glow-orb orb3"></div>
<div class="container">
    <div class="header">
        <div class="brand">
            <div class="logo-box">MX</div>
            <div class="brand-name">MeterX</div>
        </div>
        <div class="quality-badge">${qual.label}</div>
    </div>
    <div class="metrics-grid">
        <div class="metric-card dl">
            <div class="metric-icon">Download</div>
            <div class="metric-value">${entry.downloadSpeed?.toFixed(1) || '--'}</div>
            <div class="metric-unit">Mbps</div>
        </div>
        <div class="metric-card ul">
            <div class="metric-icon">Upload</div>
            <div class="metric-value">${entry.uploadSpeed?.toFixed(1) || '--'}</div>
            <div class="metric-unit">Mbps</div>
        </div>
        <div class="metric-card pi">
            <div class="metric-icon">Latency</div>
            <div class="metric-value">${entry.ping?.toFixed(0) || '--'}</div>
            <div class="metric-unit">ms</div>
        </div>
    </div>
    <div class="footer">${dateStr} • <span class="footer-link">github.com/ajithakdev/meterx-server</span></div>
</div>
</body></html>`;

    // Render to canvas
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;height:630px;';
    container.innerHTML = html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/, '').replace(/<\/body>[\s\S]*/, '');

    const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
    if (styleMatch) {
        const styleEl = document.createElement('style');
        styleEl.textContent = styleMatch[1];
        container.prepend(styleEl);
    }

    document.body.appendChild(container);

    try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(container, {
            backgroundColor: null,
            scale: 2, // 2x for retina
            useCORS: true,
            logging: false,
        });

        // Download PNG
        canvas.toBlob((blob) => {
            if (!blob) throw new Error('Canvas to blob failed');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `MeterX-Scorecard-${now.toLocaleDateString('en-CA')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        }, 'image/png');
    } finally {
        document.body.removeChild(container);
    }
}

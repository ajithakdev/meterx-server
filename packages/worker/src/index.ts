/**
 * MeterX Cloudflare Worker — Edge Speed Test Server
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 * @version 2026.0.319-MR1.0
 *
 * Replaces the Express server with a Cloudflare Worker that runs
 * at 300+ edge locations globally. Zero cold starts, ~5ms latency
 * to the nearest PoP.
 */

const ALLOWED_SIZES = [1, 5, 10, 25]; // MB
const CHUNK_SIZE = 65536; // 64KB chunks for streaming

/**
 * CORS headers for browser extension origins.
 * Allows chrome-extension:// and moz-extension:// by default.
 */
function corsHeaders(request: Request): HeadersInit {
    const origin = request.headers.get('Origin') || '';
    const allowed =
        origin.startsWith('chrome-extension://') ||
        origin.startsWith('moz-extension://') ||
        origin === 'null'; // for local dev

    return {
        'Access-Control-Allow-Origin': allowed ? origin : '',
        'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        // Allow Resource Timing API (domainLookup*/connect*) to surface across origins
        // so the extension can extract DNS lookup time.
        'Timing-Allow-Origin': allowed ? origin : '',
    };
}

/**
 * Extract Cloudflare edge location from the cf object.
 * Returns IATA code like "BOM" (Mumbai), "SIN" (Singapore), etc.
 */
function getEdgeLocation(request: Request): string {
    const cf = (request as unknown as { cf?: { colo?: string } }).cf;
    return cf?.colo || 'unknown';
}

/**
 * Stream binary data of the requested size.
 * Uses ReadableStream to avoid buffering the entire response in memory.
 */
function streamBinaryData(sizeMB: number): ReadableStream {
    const totalBytes = sizeMB * 1024 * 1024;
    let bytesSent = 0;

    return new ReadableStream({
        pull(controller) {
            const remaining = totalBytes - bytesSent;
            if (remaining <= 0) {
                controller.close();
                return;
            }
            const chunkSize = Math.min(CHUNK_SIZE, remaining);
            controller.enqueue(new Uint8Array(chunkSize));
            bytesSent += chunkSize;
        },
    });
}

/**
 * Route handler: GET /test-file/:size
 * Streams binary data for download speed measurement.
 */
function handleDownload(request: Request, sizeMB: number): Response {
    if (!ALLOWED_SIZES.includes(sizeMB)) {
        return new Response('Invalid file size', { status: 400, headers: corsHeaders(request) });
    }

    return new Response(streamBinaryData(sizeMB), {
        headers: {
            ...corsHeaders(request),
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(sizeMB * 1024 * 1024),
            'Cache-Control': 'no-store',
        },
    });
}

/**
 * Route handler: POST /upload
 * Accepts and drains the upload body for upload speed measurement.
 */
async function handleUpload(request: Request): Promise<Response> {
    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.includes('application/octet-stream')) {
        return new Response('Expected application/octet-stream', {
            status: 415,
            headers: corsHeaders(request),
        });
    }

    // Drain the body without buffering
    if (request.body) {
        const reader = request.body.getReader();
        while (true) {
            const { done } = await reader.read();
            if (done) break;
        }
    }

    return new Response('Upload received.', {
        status: 200,
        headers: corsHeaders(request),
    });
}

/**
 * Route handler: HEAD/GET /ping
 * Minimal response for latency measurement.
 */
function handlePing(request: Request, method: string): Response {
    if (method === 'HEAD') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders(request),
        });
    }
    return new Response('Pong!', {
        status: 200,
        headers: corsHeaders(request),
    });
}

/**
 * Route handler: GET /ip
 * Reflects the connecting IP + family so the extension can detect IPv4/IPv6 reachability.
 * No PII stored, only returned to the caller in-band.
 */
function handleIp(request: Request): Response {
    const ip = request.headers.get('cf-connecting-ip') || '';
    const family: 'ipv4' | 'ipv6' | 'unknown' = ip.includes(':') ? 'ipv6' : ip.match(/^\d+\.\d+\.\d+\.\d+$/) ? 'ipv4' : 'unknown';
    return new Response(
        JSON.stringify({ ip, family }),
        {
            status: 200,
            headers: {
                ...corsHeaders(request),
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Timing-Allow-Origin': '*',
            },
        }
    );
}

/**
 * Route handler: GET /health
 * Returns server status and edge location.
 */
function handleHealth(request: Request): Response {
    const location = getEdgeLocation(request);
    return new Response(
        JSON.stringify({
            status: 'ok',
            server: 'cloudflare-worker',
            edge: location,
            timestamp: new Date().toISOString(),
        }),
        {
            status: 200,
            headers: {
                ...corsHeaders(request),
                'Content-Type': 'application/json',
            },
        }
    );
}

/**
 * Main fetch handler — routes requests to the appropriate handler.
 */
export default {
    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // Handle CORS preflight
        if (method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders(request) });
        }

        // Route: /test-file/:size
        const dlMatch = path.match(/^\/test-file\/(\d+)MB\.bin$/);
        if (dlMatch && method === 'GET') {
            return handleDownload(request, parseInt(dlMatch[1], 10));
        }

        // Route: /upload
        if (path === '/upload' && method === 'POST') {
            return handleUpload(request);
        }

        // Route: /ping
        if (path === '/ping' && (method === 'HEAD' || method === 'GET')) {
            return handlePing(request, method);
        }

        // Route: /health
        if (path === '/health' && method === 'GET') {
            return handleHealth(request);
        }

        // Route: /ip
        if (path === '/ip' && method === 'GET') {
            return handleIp(request);
        }

        // 404 for everything else
        return new Response('Not found', { status: 404, headers: corsHeaders(request) });
    },
};

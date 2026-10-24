var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../../package.json
var package_default = {
  name: "meterx",
  version: "2027.0.0",
  private: true,
  description: "MeterX - Open source internet speed test browser extension",
  type: "module",
  workspaces: [
    "packages/*",
    "apps/*",
    "services/*"
  ],
  scripts: {
    lint: "eslint .",
    "lint:fix": "eslint . --fix",
    build: "npm run build --workspaces --if-present",
    start: "node services/server/dist/server.js",
    dev: "npm run build --workspaces --if-present && node services/server/dist/server.js",
    test: "npm run test --workspaces --if-present && vitest run scripts",
    package: "node scripts/package-stores.mjs",
    "dev:site": "node scripts/dev.mjs site",
    "dev:ext": "node scripts/dev.mjs ext"
  },
  keywords: ["speed-test", "browser-extension", "network-monitor"],
  author: "ajithakdev (https://github.com/ajithakdev)",
  license: "AGPL-3.0",
  devDependencies: {
    "@eslint/css": "^0.7.0",
    "@eslint/js": "^9.26.0",
    "@eslint/markdown": "^6.4.0",
    eslint: "^9.26.0",
    globals: "^16.1.0",
    typescript: "^5.8.0",
    "typescript-eslint": "^8.32.0",
    esbuild: "^0.25.0",
    vitest: "^3.0.0"
  }
};

// ../../packages/shared/src/index.ts
var VERSION = package_default.version;
var TEST_FILE_RE = /^(1|5|10|25)MB\.bin$/;
var MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
var SITE_ORIGIN = "https://meterx.ajithakdev.com";
function isAllowedOrigin(origin) {
  return isExtensionOrigin(origin) || origin === SITE_ORIGIN || /^http:\/\/localhost:\d+$/.test(origin ?? "");
}
__name(isAllowedOrigin, "isAllowedOrigin");
function isExtensionOrigin(origin) {
  return !!origin && /^(chrome|moz|safari-web)-extension:\/\/[\w.-]+$/.test(origin);
}
__name(isExtensionOrigin, "isExtensionOrigin");
function ipFamily(ip) {
  if (ip.includes(":")) return ip.startsWith("::ffff:") && /\d+\.\d+\.\d+\.\d+$/.test(ip) ? "ipv4" : "ipv6";
  return /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? "ipv4" : "unknown";
}
__name(ipFamily, "ipFamily");

// src/index.ts
var CHUNK_SIZE = 64 * 1024;
var ZEROS = new Uint8Array(CHUNK_SIZE);
var cfOf = /* @__PURE__ */ __name((request) => request.cf ?? {}, "cfOf");
function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    Vary: "Origin"
  };
  if (isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Timing-Allow-Origin"] = origin;
  }
  return headers;
}
__name(corsHeaders, "corsHeaders");
function text(request, body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { ...corsHeaders(request), ...extra } });
}
__name(text, "text");
function json(request, data) {
  return text(request, JSON.stringify(data), 200, { "Content-Type": "application/json" });
}
__name(json, "json");
function handleDownload(request, file) {
  if (!TEST_FILE_RE.test(file)) return text(request, "Invalid file size", 400);
  const total = parseInt(file, 10) * 1024 * 1024;
  let sent = 0;
  const stream = new ReadableStream({
    pull(controller) {
      const n = Math.min(CHUNK_SIZE, total - sent);
      if (n <= 0) {
        controller.close();
        return;
      }
      controller.enqueue(n === CHUNK_SIZE ? ZEROS : ZEROS.subarray(0, n));
      sent += n;
    }
  });
  return new Response(stream, {
    headers: { ...corsHeaders(request), "Content-Type": "application/octet-stream", "Content-Length": String(total) }
  });
}
__name(handleDownload, "handleDownload");
async function handleUpload(request) {
  if (!(request.headers.get("Content-Type") || "").includes("application/octet-stream")) {
    return text(request, "Expected application/octet-stream", 415);
  }
  let received = 0;
  if (request.body) {
    const reader = request.body.getReader();
    for (; ; ) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        return text(request, "Payload too large", 413);
      }
    }
  }
  return text(request, "Upload received.");
}
__name(handleUpload, "handleUpload");
function handleIp(request) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  const cf = cfOf(request);
  const info = { ip, family: ipFamily(ip), isp: cf.asOrganization, edge: cf.colo, city: cf.city, country: cf.country };
  return json(request, info);
}
__name(handleIp, "handleIp");
function handleHealth(request) {
  const body = { status: "ok", server: "cloudflare-worker", version: VERSION, edge: cfOf(request).colo, timestamp: Date.now() };
  return json(request, body);
}
__name(handleHealth, "handleHealth");
var src_default = {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;
    if (method === "OPTIONS") return text(request, null, 204);
    if (env.RATE_LIMITER && pathname !== "/health") {
      const key = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key });
      if (!success) return text(request, "Too many requests", 429, { "Retry-After": "60" });
    }
    const dl = pathname.match(/^\/test-file\/([^/]+)$/);
    if (dl && method === "GET") return handleDownload(request, dl[1]);
    if (pathname === "/upload" && method === "POST") return handleUpload(request);
    if (pathname === "/ping" && (method === "HEAD" || method === "GET")) return text(request, method === "HEAD" ? null : "Pong!");
    if (pathname === "/health" && method === "GET") return handleHealth(request);
    if (pathname === "/ip" && method === "GET") return handleIp(request);
    return text(request, "Not found", 404);
  }
};

// ../../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-VQ2J7C/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-VQ2J7C/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
/**
 * Share links: the result is base64url JSON in the URL fragment, so it never
 * reaches a server. The viewer lives at SHARE_VIEWER (apps/site/public/r/).
 * @license AGPL-3.0
 */
/**
 * Formatting helpers.
 * @license AGPL-3.0
 */
/**
 * Pure measurement helpers shared by the extension, the reports and the site.
 * @license AGPL-3.0
 */
/**
 * Quality grade and use-case readiness. The one copy of these rules (#67).
 * @license AGPL-3.0
 */
/**
 * MeterX shared contract: types, API constants and helpers used by the
 * extension, the Cloudflare Worker and the Express server.
 * @license AGPL-3.0
 */
/**
 * MeterX Cloudflare Worker: edge speed test server.
 * Streams generated bytes, drains uploads, stores nothing.
 * @author ajithakdev (https://github.com/ajithakdev)
 * @license AGPL-3.0
 */
//# sourceMappingURL=index.js.map

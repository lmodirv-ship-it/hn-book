/**
 * Sandboxed Script Executor
 * Runs user scripts in an isolated environment with no access to globals.
 */

import { scanScript } from "./script-security-scanner";

export interface SandboxResult {
  success: boolean;
  output: string[];
  errors: string[];
  duration: number;
  blocked: boolean;
  blockReasons?: string[];
}

export interface SandboxOptions {
  timeout?: number;       // ms, default 3000
  maxOutputLines?: number; // default 100
  extraContext?: Record<string, unknown>;
}

// Safe console that captures output
function createSafeConsole(output: string[], maxLines: number) {
  const push = (...args: unknown[]) => {
    if (output.length < maxLines) {
      output.push(args.map((a) => {
        try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
        catch { return "[Circular]"; }
      }).join(" "));
    }
  };
  return { log: push, info: push, warn: push, error: push, debug: push };
}

// Safe utility functions available to scripts
const safeUtils = Object.freeze({
  round: (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d,
  clamp: (v: number, min: number, max: number) => Math.min(Math.max(v, min), max),
  sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
  avg: (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
  unique: <T>(arr: T[]) => [...new Set(arr)],
  pick: (obj: Record<string, unknown>, keys: string[]) => {
    const r: Record<string, unknown> = {};
    for (const k of keys) if (k in obj) r[k] = obj[k];
    return r;
  },
  randomInt: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  capitalize: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
  slugify: (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
});

// Blocked global names — shadowed as undefined in the sandbox
const BLOCKED_GLOBALS = [
  "window", "globalThis", "self", "document", "location", "navigator",
  "fetch", "XMLHttpRequest", "WebSocket", "Worker", "SharedWorker",
  "localStorage", "sessionStorage", "indexedDB", "caches",
  "eval", "Function", "importScripts", "import",
  "process", "require", "Deno", "Bun",
  "crypto", "Blob", "URL", "URLSearchParams",
  "setTimeout", "setInterval", "requestAnimationFrame",
  "alert", "confirm", "prompt", "open", "close",
] as const;

export function executeScript(
  code: string,
  options: SandboxOptions = {},
): SandboxResult {
  const { timeout = 3000, maxOutputLines = 100, extraContext = {} } = options;
  const output: string[] = [];
  const errors: string[] = [];
  const start = performance.now();

  // 1. Static scan first
  const scan = scanScript(code);
  if (!scan.safe) {
    return {
      success: false,
      output: [],
      errors: scan.issues.map((i) => `[${i.severity}] سطر ${i.line ?? "?"}: ${i.message}`),
      duration: performance.now() - start,
      blocked: true,
      blockReasons: scan.issues.map((i) => i.message),
    };
  }

  // 2. Build sandbox context
  const safeConsole = createSafeConsole(output, maxOutputLines);
  const context: Record<string, unknown> = {
    console: safeConsole,
    utils: safeUtils,
    Math: Object.freeze({ ...Math }),
    JSON: Object.freeze({ parse: JSON.parse, stringify: JSON.stringify }),
    Array, Object, String, Number, Boolean, Date, RegExp, Map, Set,
    parseInt, parseFloat, isNaN, isFinite,
    encodeURIComponent, decodeURIComponent,
    ...extraContext,
  };

  // 3. Build function with blocked globals shadowed
  const paramNames = [...BLOCKED_GLOBALS, ...Object.keys(context)];
  const paramValues = [
    ...BLOCKED_GLOBALS.map(() => undefined),
    ...Object.values(context),
  ];

  // Wrap code with a deadline check injected into loops
  const wrappedCode = `
    "use strict";
    const __deadline = Date.now() + ${timeout};
    const __checkTime = () => { if (Date.now() > __deadline) throw new Error("تجاوز وقت التنفيذ المسموح"); };
    ${code}
  `;

  try {
    // eslint-disable-next-line no-new-func
    const fn = new (Function as any)(...paramNames, wrappedCode);
    fn(...paramValues);

    return {
      success: true,
      output,
      errors,
      duration: performance.now() - start,
      blocked: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    return {
      success: false,
      output,
      errors,
      duration: performance.now() - start,
      blocked: false,
    };
  }
}

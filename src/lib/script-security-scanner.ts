/**
 * Script Security Scanner
 * Analyzes user scripts for dangerous patterns before execution.
 */

export interface ScanResult {
  safe: boolean;
  issues: ScanIssue[];
}

export interface ScanIssue {
  type: "blocked_api" | "infinite_loop" | "recursion" | "dangerous_pattern";
  pattern: string;
  line?: number;
  severity: "critical" | "warning";
  message: string;
}

const BLOCKED_PATTERNS: { regex: RegExp; type: ScanIssue["type"]; severity: ScanIssue["severity"]; message: string }[] = [
  // Dangerous execution
  { regex: /\beval\s*\(/, type: "blocked_api", severity: "critical", message: "eval() يسمح بتنفيذ كود عشوائي" },
  { regex: /new\s+Function\s*\(/, type: "blocked_api", severity: "critical", message: "new Function() يسمح بتنفيذ كود عشوائي" },

  // Network access
  { regex: /\bfetch\s*\(/, type: "blocked_api", severity: "critical", message: "fetch() يسمح بالوصول للشبكة" },
  { regex: /\bXMLHttpRequest\b/, type: "blocked_api", severity: "critical", message: "XMLHttpRequest يسمح بالوصول للشبكة" },

  // DOM/Window access
  { regex: /\bdocument\s*\./, type: "blocked_api", severity: "critical", message: "الوصول إلى document محظور" },
  { regex: /\bwindow\s*\./, type: "blocked_api", severity: "critical", message: "الوصول إلى window محظور" },

  // Storage
  { regex: /\blocalStorage\b/, type: "blocked_api", severity: "critical", message: "localStorage محظور" },
  { regex: /\bsessionStorage\b/, type: "blocked_api", severity: "critical", message: "sessionStorage محظور" },

  // Node/system
  { regex: /\bprocess\s*\./, type: "blocked_api", severity: "critical", message: "الوصول إلى process محظور" },
  { regex: /\brequire\s*\(/, type: "blocked_api", severity: "critical", message: "require() محظور" },
  { regex: /\bimport\s*\(/, type: "blocked_api", severity: "critical", message: "import() الديناميكي محظور" },

  // Infinite loops
  { regex: /while\s*\(\s*true\s*\)/, type: "infinite_loop", severity: "critical", message: "حلقة لا نهائية: while(true)" },
  { regex: /for\s*\(\s*;\s*;\s*\)/, type: "infinite_loop", severity: "critical", message: "حلقة لا نهائية: for(;;)" },
  { regex: /while\s*\(\s*1\s*\)/, type: "infinite_loop", severity: "critical", message: "حلقة لا نهائية: while(1)" },
  { regex: /do\s*\{[\s\S]*?\}\s*while\s*\(\s*true\s*\)/, type: "infinite_loop", severity: "critical", message: "حلقة لا نهائية: do...while(true)" },

  // Other dangerous patterns
  { regex: /\b__proto__\b/, type: "dangerous_pattern", severity: "warning", message: "التلاعب بـ __proto__ خطير" },
  { regex: /\bconstructor\s*\[/, type: "dangerous_pattern", severity: "warning", message: "الوصول الديناميكي إلى constructor محظور" },
];

function stripComments(code: string): string {
  return code
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function detectDeepRecursion(code: string): ScanIssue | null {
  const fnNames = [...code.matchAll(/function\s+(\w+)/g)].map((m) => m[1]);
  for (const name of fnNames) {
    const callPattern = new RegExp(`\\b${name}\\s*\\(`);
    const fnBody = code.slice(code.indexOf(`function ${name}`));
    const braceStart = fnBody.indexOf("{");
    if (braceStart === -1) continue;
    let depth = 0;
    let end = braceStart;
    for (let i = braceStart; i < fnBody.length; i++) {
      if (fnBody[i] === "{") depth++;
      if (fnBody[i] === "}") depth--;
      if (depth === 0) { end = i; break; }
    }
    const body = fnBody.slice(braceStart, end + 1);
    if (callPattern.test(body)) {
      const hasBaseCase = /if\s*\(/.test(body) || /return\b/.test(body.split(name)[0]);
      if (!hasBaseCase) {
        return {
          type: "recursion",
          pattern: name,
          severity: "warning",
          message: `الدالة ${name} تستدعي نفسها بدون شرط توقف واضح`,
        };
      }
    }
  }
  return null;
}

export function scanScript(code: string): ScanResult {
  const cleaned = stripComments(code);
  const lines = cleaned.split("\n");
  const issues: ScanIssue[] = [];

  for (const { regex, type, severity, message } of BLOCKED_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        issues.push({
          type,
          pattern: lines[i].trim().slice(0, 60),
          line: i + 1,
          severity,
          message,
        });
      }
    }
  }

  const recursionIssue = detectDeepRecursion(cleaned);
  if (recursionIssue) issues.push(recursionIssue);

  return {
    safe: issues.filter((i) => i.severity === "critical").length === 0,
    issues,
  };
}

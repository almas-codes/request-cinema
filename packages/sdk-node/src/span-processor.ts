export interface CodeLocation {
  file: string;
  func: string;
  line: number;
}

/**
 * Extracts callers from Error stack trace across Windows, Linux, and macOS.
 */
export function extractCallStack(): CodeLocation | null {
  const err = new Error();
  if (!err.stack) return null;

  const lines = err.stack.split('\n');
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i]?.trim();
    if (!rawLine) continue;
    if (rawLine.includes('node:internal') || rawLine.includes('extractCallStack')) continue;

    // Match "at FunctionName (path:line:col)" or "at path:line:col"
    const match = rawLine.match(/^at\s+(?:(.*?)\s+\()?((?:[a-zA-Z]:)?[^:()]+):(\d+):(\d+)\)?$/);
    if (match) {
      const func = match[1] || 'anonymous';
      const file = match[2] || '';
      const lineNum = Number.parseInt(match[3] || '0', 10);
      if (file && lineNum > 0) {
        return { file, func, line: lineNum };
      }
    }
  }

  return null;
}

export class CodeSpanProcessor {
  private enabled: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  onStart(span: { setAttribute: (key: string, val: string | number) => void }): void {
    if (!this.enabled) return;

    const loc = extractCallStack();
    if (loc) {
      span.setAttribute('code.file.path', loc.file);
      span.setAttribute('code.function.name', loc.func);
      span.setAttribute('code.line.number', loc.line);
    }
  }
}

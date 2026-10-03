import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, normalize, relative, resolve } from 'node:path';
import type { Span } from '@request-cinema/trace-model';
import type { ResolverOptions, SourceLocation } from './types.js';

/**
 * Checks if a candidate path is safely contained within allowed root directories.
 * Blocks directory traversal attacks (e.g. ../../etc/passwd).
 */
export function isSafePath(candidatePath: string, allowedRoots: readonly string[]): boolean {
  for (const root of allowedRoots) {
    const resolvedRoot = resolve(normalize(root));
    const target = isAbsolute(candidatePath)
      ? resolve(candidatePath)
      : resolve(resolvedRoot, candidatePath);
    const rel = relative(resolvedRoot, target);
    if (!rel.startsWith('..') && !isAbsolute(rel)) {
      return true;
    }
  }
  return false;
}

/**
 * Reads lines around target line number.
 */
export function extractSnippet(filePath: string, line: number, contextLines = 3): string {
  try {
    if (!existsSync(filePath)) return '';
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const start = Math.max(0, line - 1 - contextLines);
    const end = Math.min(lines.length, line + contextLines);
    return lines.slice(start, end).join('\n');
  } catch {
    return '';
  }
}

/**
 * Resolves a span to source code location using the 4-tier fallback ladder.
 */
export function resolveSpanToCode(span: Span, options: ResolverOptions): SourceLocation {
  const attrs = span.attributes;

  // 1. Explicit OTel attributes
  const explicitFile =
    (attrs['code.file.path'] as string) || (attrs['code.filepath'] as string) || span.code?.file;

  const explicitFunc =
    (attrs['code.function.name'] as string) ||
    (attrs['code.function'] as string) ||
    span.code?.function;

  const explicitLine =
    typeof attrs['code.line.number'] === 'number'
      ? (attrs['code.line.number'] as number)
      : typeof attrs['code.lineno'] === 'number'
        ? (attrs['code.lineno'] as number)
        : span.code?.line;

  if (explicitFile) {
    if (isSafePath(explicitFile, options.sourceRoots)) {
      const root = options.sourceRoots[0] ?? '.';
      const fullPath = isAbsolute(explicitFile) ? explicitFile : resolve(root, explicitFile);
      const snippet = explicitLine ? extractSnippet(fullPath, explicitLine) : undefined;
      return {
        file: explicitFile,
        function: explicitFunc,
        line: explicitLine,
        codeSnippet: snippet,
        resolvedVia: 'explicit_attr',
      };
    }
  }

  // 2. Exception stack frame from span events
  for (const event of span.events) {
    if (event.name === 'exception' && event.attributes) {
      const stack = event.attributes['exception.stacktrace'];
      if (typeof stack === 'string') {
        const match = stack.match(/at\s+(?:.*?\s+\()?([a-zA-Z0-9_\-./\\]+):(\d+):(\d+)\)?/);
        if (match) {
          const fileMatch = match[1];
          const lineMatch = match[2];
          if (fileMatch && lineMatch && isSafePath(fileMatch, options.sourceRoots)) {
            const lineNum = Number.parseInt(lineMatch, 10);
            return {
              file: fileMatch,
              line: lineNum,
              resolvedVia: 'stack_trace',
            };
          }
        }
      }
    }
  }

  // 3. Name heuristic (e.g. "GET /orders" or "PaymentService.process")
  if (span.name.includes('.')) {
    const parts = span.name.split('.');
    const symbol = parts[parts.length - 1];
    return {
      function: symbol,
      resolvedVia: 'name_heuristic',
    };
  }

  // 4. Unresolved
  return {
    resolvedVia: 'unresolved',
  };
}

import type { AttrPrimitive, AttrValue } from '@request-cinema/trace-model';

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[-_]?key/i,
  /auth(orization)?/i,
  /credential/i,
  /cookie/i,
  /session[-_]?id/i,
  /private[-_]?key/i,
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
const CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;

/**
 * Scrubs a single primitive attribute value of PII and credentials.
 */
export function scrubPrimitive(val: AttrPrimitive): AttrPrimitive {
  if (typeof val !== 'string') {
    return val;
  }

  let text = val;
  if (JWT_REGEX.test(text)) {
    text = text.replace(JWT_REGEX, '[REDACTED_JWT]');
  }
  if (EMAIL_REGEX.test(text)) {
    text = text.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
  }
  if (CARD_REGEX.test(text)) {
    text = text.replace(CARD_REGEX, '[REDACTED_CARD]');
  }

  return text;
}

/**
 * Checks whether an attribute key itself represents a sensitive credential.
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pat) => pat.test(key));
}

export interface RedactionOptions {
  allowlist?: readonly string[] | undefined;
  denylist?: readonly string[] | undefined;
}

/**
 * Redacts a map of span attributes according to security policies.
 * Guarantees that sensitive secrets, emails, and credit cards are scrubbed prior to storage.
 */
export function redactAttributes(
  attributes: Record<string, AttrValue>,
  options: RedactionOptions = {},
): Record<string, AttrValue> {
  const result: Record<string, AttrValue> = {};
  const allowlistSet = options.allowlist ? new Set(options.allowlist) : null;

  for (const [key, value] of Object.entries(attributes)) {
    if (allowlistSet && !allowlistSet.has(key)) {
      continue;
    }

    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED_SECRET]';
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map(scrubPrimitive);
    } else {
      result[key] = scrubPrimitive(value);
    }
  }

  return result;
}

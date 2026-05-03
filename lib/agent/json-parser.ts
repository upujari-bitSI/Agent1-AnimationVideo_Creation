/**
 * Robustly extracts and parses JSON from raw LLM output.
 * Handles: markdown fences, preamble text, literal control characters inside strings,
 * trailing commas, and other common LLM formatting quirks.
 */

/** Strip markdown fences and extract the first JSON array or object */
export function extractJson(raw: string): string {
  // Remove markdown code fences
  let text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // Find the outermost JSON structure (array or object)
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  const objectMatch = text.match(/\{[\s\S]*\}/);

  if (arrayMatch && objectMatch) {
    // Return whichever starts first
    return arrayMatch.index! <= objectMatch.index! ? arrayMatch[0] : objectMatch[0];
  }
  if (arrayMatch) return arrayMatch[0];
  if (objectMatch) return objectMatch[0];

  // Fallback: return the whole cleaned text
  return text;
}

/**
 * Sanitize a JSON string to fix common LLM output issues:
 * - Literal newlines / tabs / carriage returns inside string values
 * - Trailing commas before } or ]
 */
export function sanitizeJson(jsonStr: string): string {
  // Replace literal control characters inside JSON strings.
  // We walk character by character tracking whether we're inside a string.
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (escaped) {
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      // Replace bare control characters with their escape sequences
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      // Null byte and other control chars
      if (ch.charCodeAt(0) < 0x20) { result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`; continue; }
    }

    result += ch;
  }

  // Remove trailing commas before closing brackets/braces
  result = result.replace(/,(\s*[}\]])/g, "$1");

  return result;
}

/** Parse a JSON array from raw LLM output */
export function parseJsonArray<T>(raw: string): T[] {
  const extracted = extractJson(raw);
  const sanitized = sanitizeJson(extracted);
  const parsed = JSON.parse(sanitized);
  if (!Array.isArray(parsed)) throw new Error("Expected JSON array, got object");
  return parsed as T[];
}

/** Parse a JSON object from raw LLM output */
export function parseJsonObject<T>(raw: string): T {
  const extracted = extractJson(raw);
  const sanitized = sanitizeJson(extracted);
  return JSON.parse(sanitized) as T;
}

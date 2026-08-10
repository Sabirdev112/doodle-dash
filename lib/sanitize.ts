const HTML_TAG_REGEX = /<[^>]*>/g;
const SCRIPT_REGEX = /javascript:/gi;

export function sanitizeText(input: string, maxLength = 100): string {
  return input
    .replace(HTML_TAG_REGEX, "")
    .replace(SCRIPT_REGEX, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizePlayerName(name: string): string {
  return sanitizeText(name, 20);
}

export function sanitizeGuess(text: string): string {
  return sanitizeText(text, 50);
}

export function sanitizeCustomWords(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((w) => sanitizeText(w, 30).toLowerCase())
    .filter((w) => w.length >= 2 && /^[a-z\s'-]+$/i.test(w));
}

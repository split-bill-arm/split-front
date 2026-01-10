export function normalizeTableToken(input: string): string {
  const s = (input ?? "").trim();
  if (!s) return s;

  // If user types only digits (e.g. "12"), convert to "table-12"
  if (/^\d+$/.test(s)) return `table-${s}`;

  // Otherwise treat as full token (e.g. "table-12" or any future QR token)
  return s;
}

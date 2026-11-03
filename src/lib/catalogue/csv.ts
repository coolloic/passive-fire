/**
 * Minimal RFC 4180 CSV parser: quoted fields, escaped quotes ("") and CRLF or LF line endings.
 * Strips a leading byte-order mark. Returns rows as arrays of raw strings.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error("Malformed CSV: unterminated quoted field");
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parses CSV with a header row into records keyed by header name. */
export function parseCsvRecords(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  return rows
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row, index) => {
      if (row.length !== header.length) {
        throw new Error(
          `Malformed CSV: row ${index + 2} has ${row.length} fields, expected ${header.length}`,
        );
      }
      return Object.fromEntries(header.map((name, column) => [name.trim(), row[column]]));
    });
}

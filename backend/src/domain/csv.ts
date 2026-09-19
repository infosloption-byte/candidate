export const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    if (row.length === 1 && row[0] === '') {
      row = [];
      return;
    }
    pushField();
    rows.push(row);
    row = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === ',') {
      pushField();
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      pushRow();
      continue;
    }

    field += char;
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field.length > 0 || row.length > 0) pushRow();

  return rows;
};

export const csvRowsToObjects = (input: string): Array<Record<string, string>> => {
  const rows = parseCsv(input);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, '') : header).trim().toLowerCase());

  return rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, values[index]?.trim() ?? '']),
  ));
};

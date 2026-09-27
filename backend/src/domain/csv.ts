const stripInvisibleCharacters = (value: string): string =>
  value
    .replace(/^\uFEFF/, '')
    .replace(/[\u0000\u200B-\u200D\u2060\u00A0]/g, ' ')
    .trim();

const normalizeCsvHeader = (header: string): string =>
  stripInvisibleCharacters(header)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const detectDelimiter = (input: string): string => {
  const firstLine = input.split(/\r\n|\n|\r/).find((line) => line.trim()) ?? '';
  const candidates = [',', ';', '\t'];
  let best = ',';
  let bestCount = -1;

  for (const delimiter of candidates) {
    let quoted = false;
    let count = 0;

    for (let index = 0; index < firstLine.length; index += 1) {
      const char = firstLine[index];
      if (char === '"') {
        if (quoted && firstLine[index + 1] === '"') {
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (!quoted && char === delimiter) {
        count += 1;
      }
    }

    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }

  return best;
};

export const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const delimiter = detectDelimiter(input);

  const pushField = () => {
    row.push(stripInvisibleCharacters(field));
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

    if (!quoted && char === delimiter) {
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

  const headers = rows[0].map(normalizeCsvHeader);

  return rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, stripInvisibleCharacters(values[index] ?? '')]),
  ));
};

import { findDuplicateMatchesForDraft } from './candidateMatching';
import type {
  Availability,
  Candidate,
  CandidateDraft,
  CandidateDuplicateMatch,
  CandidateSource,
  EnglishLevel,
} from '../types/candidate';

export interface CandidateImportParsedRow {
  rowNumber: number;
  draft: CandidateDraft;
  errors: string[];
  warnings: string[];
  duplicates: CandidateDuplicateMatch[];
  raw: Record<string, string>;
}

export interface CandidateImportPreview {
  headers: string[];
  rows: CandidateImportParsedRow[];
  validCount: number;
  errorCount: number;
  highConfidenceDuplicateCount: number;
}

type ColumnKey =
  | 'name'
  | 'phone'
  | 'passportNumber'
  | 'age'
  | 'location'
  | 'profession'
  | 'originalProfession'
  | 'experienceYears'
  | 'secondarySkills'
  | 'overseasCountries'
  | 'englishLevel'
  | 'locationReady'
  | 'drivingLicense'
  | 'availability'
  | 'source';

const aliases: Record<ColumnKey, string[]> = {
  name: ['name', 'fullname', 'full name', 'candidate name', 'candidate'],
  phone: ['phone', 'mobile', 'mobile number', 'phone number', 'contact'],
  passportNumber: ['passport', 'passport number', 'passport no', 'passportnumber'],
  age: ['age'],
  location: ['location', 'current location', 'city', 'address'],
  profession: ['profession', 'primary profession', 'trade', 'job', 'job title'],
  originalProfession: ['original profession', 'original trade'],
  experienceYears: ['experience', 'experience years', 'years experience', 'experience in years'],
  secondarySkills: ['skills', 'secondary skills', 'other skills', 'secondaryskills'],
  overseasCountries: ['countries worked in', 'overseas countries', 'overseas experience', 'countries'],
  englishLevel: ['english', 'english level', 'englishlevel'],
  locationReady: ['location ready', 'location readiness', 'locationready'],
  drivingLicense: ['driving license', 'driving licence', 'drivinglicense', 'drivinglicence'],
  availability: ['availability', 'available'],
  source: ['source', 'candidate source'],
};

const normalizeHeader = (value: string): string => value.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
const normalizeValue = (value: string): string => value.trim();

const parseCsvMatrix = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') quoted = true;
    else if (character === ',') { row.push(cell); cell = ''; }
    else if (character === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (character !== '\r') cell += character;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
};

const findColumn = (headers: string[], key: ColumnKey): number => {
  const options = aliases[key];
  return headers.findIndex((header) => options.includes(normalizeHeader(header)));
};

const valueAt = (row: string[], index: number): string => index >= 0 ? normalizeValue(row[index] ?? '') : '';
const parseBoolean = (value: string): boolean => ['yes', 'true', '1', 'y'].includes(value.toLowerCase());

const asEnglishLevel = (value: string): EnglishLevel => {
  const allowed: EnglishLevel[] = ['Not assessed', 'Basic', 'Working', 'Good', 'Strong'];
  return allowed.find((item) => item.toLowerCase() === value.toLowerCase()) ?? 'Not assessed';
};

const asAvailability = (value: string): Availability => {
  const allowed: Availability[] = ['Available now', 'Within 2 weeks', 'Within 1 month', 'Not available'];
  return allowed.find((item) => item.toLowerCase() === value.toLowerCase()) ?? 'Available now';
};

const asSource = (value: string): CandidateSource => {
  const allowed: CandidateSource[] = ['Walk-in', 'Referral', 'Agency', 'Existing database', 'Bulk import'];
  return allowed.find((item) => item.toLowerCase() === value.toLowerCase()) ?? 'Bulk import';
};

const makeDraft = (row: string[], headers: string[]): CandidateDraft => {
  const columnIndexes = Object.fromEntries(
    (Object.keys(aliases) as ColumnKey[]).map((key) => [key, findColumn(headers, key)]),
  ) as Record<ColumnKey, number>;

  return {
    name: valueAt(row, columnIndexes.name),
    phone: valueAt(row, columnIndexes.phone),
    passportNumber: valueAt(row, columnIndexes.passportNumber),
    age: valueAt(row, columnIndexes.age),
    location: valueAt(row, columnIndexes.location),
    profession: valueAt(row, columnIndexes.profession),
    originalProfession: valueAt(row, columnIndexes.originalProfession),
    experienceYears: valueAt(row, columnIndexes.experienceYears),
    secondarySkills: valueAt(row, columnIndexes.secondarySkills),
    overseasCountries: valueAt(row, columnIndexes.overseasCountries),
    englishLevel: asEnglishLevel(valueAt(row, columnIndexes.englishLevel)),
    locationReady: parseBoolean(valueAt(row, columnIndexes.locationReady)),
    drivingLicense: parseBoolean(valueAt(row, columnIndexes.drivingLicense)),
    availability: asAvailability(valueAt(row, columnIndexes.availability)),
    source: asSource(valueAt(row, columnIndexes.source)),
  };
};

export const parseCandidateImport = (text: string, existingCandidates: Candidate[]): CandidateImportPreview => {
  const matrix = parseCsvMatrix(text);
  if (matrix.length === 0) return { headers: [], rows: [], validCount: 0, errorCount: 0, highConfidenceDuplicateCount: 0 };

  const headers = matrix[0]?.map(normalizeValue) ?? [];
  const rows: CandidateImportParsedRow[] = matrix.slice(1).map((values, index) => {
    const draft = makeDraft(values, headers);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!draft.name) errors.push('Name is required.');
    if (!draft.phone) errors.push('Phone is required.');
    if (!draft.profession) errors.push('Profession is required.');
    if (!draft.experienceYears || !Number.isFinite(Number(draft.experienceYears)) || Number(draft.experienceYears) < 0 || Number(draft.experienceYears) > 50) {
      errors.push('Experience years must be a number from 0 to 50.');
    }
    if (draft.age && (!Number.isFinite(Number(draft.age)) || Number(draft.age) < 18 || Number(draft.age) > 70)) {
      errors.push('Age must be between 18 and 70 when provided.');
    }
    if (!draft.passportNumber) warnings.push('Passport number is missing; document readiness will need follow-up.');
    if (draft.englishLevel === 'Not assessed') warnings.push('English level is not assessed.');

    const duplicates = findDuplicateMatchesForDraft(existingCandidates, draft);
    const highConfidence = duplicates.filter((match) => match.confidence === 'high');
    if (highConfidence.length > 0) warnings.push(\`High-confidence duplicate: \${highConfidence.map((match) => match.reasons.join(', ')).join(' · ')}\`);
    else if (duplicates.length > 0) warnings.push('Possible duplicate match found; review before import.');

    return {
      rowNumber: index + 2,
      draft,
      errors,
      warnings,
      duplicates,
      raw: Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? ''])),
    };
  });

  return {
    headers,
    rows,
    validCount: rows.filter((row) => row.errors.length === 0 && !row.duplicates.some((match) => match.confidence === 'high')).length,
    errorCount: rows.filter((row) => row.errors.length > 0).length,
    highConfidenceDuplicateCount: rows.filter((row) => row.duplicates.some((match) => match.confidence === 'high')).length,
  };
};

export const candidateImportTemplate = [
  'Name,Phone,Passport Number,Age,Location,Profession,Original Profession,Experience Years,Secondary Skills,Countries Worked In,English Level,Location Ready,Driving License,Availability,Source',
  'Kasun Perera,+94 77 123 4567,N7XXXX21,31,Colombo,Mason,Mason,9,"Tile,Putty,Plaster","Qatar,UAE",Good,Yes,Yes,Available now,Agency',
].join('\n');

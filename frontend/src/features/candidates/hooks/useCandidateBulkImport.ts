import { useCallback, useMemo, useState } from 'react';
import { parseCandidateImport, type CandidateImportPreview } from '../services/candidateImport';
import type { Candidate } from '../types/candidate';

const makeId = (prefix: string): string => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const useCandidateBulkImport = (
  existingCandidates: Candidate[],
  onImport: (candidates: Candidate[]) => void,
  onClose: () => void,
) => {
  const [preview, setPreview] = useState<CandidateImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [includeHighConfidenceDuplicates, setIncludeHighConfidenceDuplicates] = useState(false);

  const parseFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCandidateImport(text, existingCandidates);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError('The CSV needs a header row and at least one candidate row.');
        setPreview(null);
        return;
      }
      setFileName(file.name);
      setPreview(parsed);
    } catch {
      setPreview(null);
      setError('The CSV could not be read. Check the file and try again.');
    } finally {
      setParsing(false);
    }
  }, [existingCandidates]);

  const reset = useCallback(() => {
    setPreview(null);
    setFileName('');
    setError(null);
    setParsing(false);
    setIncludeHighConfidenceDuplicates(false);
  }, []);

  const importCandidates = useCallback(() => {
    if (!preview) return;
    const now = new Date().toISOString();
    const candidates: Candidate[] = preview.rows
      .filter((row) => row.errors.length === 0)
      .filter((row) => includeHighConfidenceDuplicates || !row.duplicates.some((match) => match.confidence === 'high'))
      .map((row, index) => {
        const draft = row.draft;
        const id = makeId('cand');
        return {
          id,
          reference: `CA-${String(Date.now() + index).slice(-6)}`,
          name: draft.name.trim(),
          phone: draft.phone.trim(),
          passportNumber: draft.passportNumber.trim() || 'Not provided',
          age: Number(draft.age) || 0,
          location: draft.location.trim() || 'Not provided',
          profession: draft.profession.trim(),
          originalProfession: draft.originalProfession.trim() || draft.profession.trim(),
          experienceYears: Number(draft.experienceYears),
          secondarySkills: draft.secondarySkills.split(',').map((value) => value.trim()).filter(Boolean),
          overseasCountries: draft.overseasCountries.split(',').map((value) => value.trim()).filter(Boolean),
          tags: [],
          englishLevel: draft.englishLevel,
          locationReady: draft.locationReady,
          drivingLicense: draft.drivingLicense,
          availability: draft.availability,
          source: 'Bulk import',
          status: 'new',
          onboarding: { status: 'not-started', completionPercent: 0, lastActivityAt: now },
          fitScore: 0,
          documents: {
            passport: draft.passportNumber.trim() ? 'needs-review' : 'missing',
            cv: 'missing',
            tradeCertificate: 'missing',
          },
          journey: [{
            id: makeId('journey'),
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            title: 'Candidate imported',
            detail: 'Candidate record was created from a recruiter bulk import.',
            tone: 'neutral',
          }],
          createdAt: now,
        };
      });

    if (candidates.length === 0) {
      setError('There are no importable rows. Resolve validation errors or review the duplicate setting.');
      return;
    }

    onImport(candidates);
    reset();
    onClose();
  }, [includeHighConfidenceDuplicates, onClose, onImport, preview, reset]);

  const importableCount = useMemo(
    () => preview?.rows.filter((row) => row.errors.length === 0 && (includeHighConfidenceDuplicates || !row.duplicates.some((match) => match.confidence === 'high'))).length ?? 0,
    [includeHighConfidenceDuplicates, preview],
  );

  return {
    preview,
    fileName,
    error,
    parsing,
    includeHighConfidenceDuplicates,
    importableCount,
    actions: {
      parseFile,
      setIncludeHighConfidenceDuplicates,
      importCandidates,
      reset,
    },
  };
};

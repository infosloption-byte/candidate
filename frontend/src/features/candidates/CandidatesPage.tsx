import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { StatusPill } from '../../shared/components/StatusPill';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { DataTable } from '../../shared/components/DataTable';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { Pagination } from '../../shared/components/Pagination';
import { StateMessage } from '../../shared/components/StateMessage';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, CandidateAuditEvent, CandidateHistoryInterview, CandidateStatus, CandidateStatusHistory, OnboardingStatus, UserRole } from '../../domain/types';
import { CandidateDocumentsPanel } from './CandidateDocumentsPanel';
import { CandidateProfilePanel, type CandidateProfileHistory } from './CandidateProfilePanel';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';

interface Props { role: UserRole; }

const emptyForm = { name: '', birthdate: '', email: '', phone: '', alternatePhone: '', country: '', passportNumber: '', passportExpiry: '', currentLocation: '', availability: '', visaStatus: '', profession: '', experienceYears: '0', skills: '' };
const statusOptions: CandidateStatus[] = ['POOL', 'READY_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEW_COMPLETED', 'PASSED', 'REJECTED', 'ON_HOLD', 'HIRED', 'INACTIVE'];

const label = (value: string): string => value.replaceAll('_', ' ');
const finalStatusOptions: CandidateStatus[] = ['PASSED', 'REJECTED', 'HIRED'];
const CANDIDATES_PAGE_SIZE = 10;

const parseCsvRows = (input: string): string[][] => {
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
  if (field.length || row.length) pushRow();
  return rows;
};

export const CandidatesPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state, dispatch } = useRecruitment();
  const [candidates, setCandidates] = useState<Candidate[]>(developmentMode ? state.candidates : []);
  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [agencyId, setAgencyId] = useState(user?.role === 'ADMIN' ? '' : (user?.agencyId ?? 'agency-1'));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [profileForm, setProfileForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [professionFilter, setProfessionFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [visaStatusFilter, setVisaStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [passportFilter, setPassportFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [listView, setListView] = useState<'cards' | 'table'>('table');
  const [candidatePage, setCandidatePage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'profession' | 'experience' | 'passport' | 'status'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [statusDraft, setStatusDraft] = useState<CandidateStatus | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [history, setHistory] = useState<CandidateProfileHistory>({ statusHistory: [], interviews: [], auditEvents: [] });
  const [loading, setLoading] = useState(!developmentMode);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [successTitle, setSuccessTitle] = useState('');
  const [editingCandidateProfile, setEditingCandidateProfile] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'documents' | 'activity'>('overview');
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);
  const [profilePanelMinimized, setProfilePanelMinimized] = useState(false);
  const [profilePanelMaximized, setProfilePanelMaximized] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importAgencyId, setImportAgencyId] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const bulkFileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (developmentMode) {
      setCandidates(state.candidates);
      setAgencies(state.agencies);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      apiFetch<Candidate[]>('/candidates'),
      role === 'ADMIN' ? apiFetch<Agency[]>('/agencies') : Promise.resolve([] as Agency[]),
    ])
      .then(([candidateResult, agencyResult]) => {
        if (cancelled) return;
        setCandidates(candidateResult);
        if (role === 'ADMIN') {
          setAgencies(agencyResult);
        }
      })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load candidates.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [developmentMode, role, state.candidates, state.agencies, user?.id]);

  const candidate = useMemo(
    () => candidates.find((item) => item.id === (selectedCandidateId || user?.candidateId)),
    [candidates, selectedCandidateId, user?.candidateId],
  );

  const candidateModalOpen = Boolean(candidate && selectedCandidateId);

  const candidateModalRef = useFocusTrap<HTMLDivElement>({
    enabled: candidateModalOpen,
    onEscape: () => {
      setSelectedCandidateId('');
      setEditingCandidateProfile(false);
    },
  });
  const candidateFormModalOpen = showForm && role !== 'INTERVIEWEE';
  const candidateFormModalRef = useFocusTrap<HTMLDivElement>({
    enabled: candidateFormModalOpen,
    onEscape: () => setShowForm(false),
  });
  const importModalRef = useFocusTrap<HTMLDivElement>({
    enabled: showImportModal,
    onEscape: () => setShowImportModal(false),
  });

  useEffect(() => {
    if (!candidateModalOpen && !candidateFormModalOpen && !showImportModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [candidateModalOpen, candidateFormModalOpen, showImportModal]);

  useEffect(() => {
    if (!candidate || role === 'INTERVIEWEE') return;
    setStatusDraft(candidate.status);
    setStatusReason('');
    if (developmentMode) {
      const linkedAccount = state.users.find((item) => item.candidateId === candidate.id);
      const agency = state.agencies.find((item) => item.id === candidate.agencyId);
      const recordDate = candidate.createdAt ?? candidate.statusUpdatedAt;
      const updatedDate = candidate.updatedAt ?? candidate.statusUpdatedAt;
      setHistory({
        profile: {
          agency: agency ? { id: agency.id, name: agency.name, slug: agency.slug, status: agency.status } : null,
          account: linkedAccount ? {
            id: linkedAccount.id,
            name: linkedAccount.name,
            email: linkedAccount.email,
            role: linkedAccount.role,
            active: linkedAccount.active,
            createdAt: recordDate,
            updatedAt: updatedDate,
          } : null,
          createdAt: recordDate,
          updatedAt: updatedDate,
        },
        statusHistory: [{
          id: 'history-' + candidate.id,
          candidateId: candidate.id,
          fromStatus: null,
          toStatus: 'POOL',
          reason: 'Candidate added to the candidate pool.',
          changedBy: null,
          createdAt: candidate.statusUpdatedAt,
        }],
        interviews: state.interviews.filter((item) => item.candidateId === candidate.id).map((item) => ({
          id: item.id,
          candidateId: item.candidateId,
          type: item.type,
          status: item.status,
          scheduledAt: item.scheduledAt,
          durationMins: item.durationMins,
          location: item.location,
          notes: item.notes ?? null,
          startedAt: item.startedAt ?? null,
          completedAt: item.completedAt ?? null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          job: item.job ? { id: item.job.id, title: item.job.title, location: item.job.location } : null,
          panel: item.panel ?? [],
          evaluations: item.evaluations ?? [],
        })),
        auditEvents: [],
      });
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    apiFetch<CandidateProfileHistory>('/candidates/' + candidate.id + '/history')
      .then((result) => { if (!cancelled) setHistory(result); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load candidate history.'); })
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [candidate?.birthdate, candidate?.id, developmentMode, role, state.interviews]);

  useEffect(() => {
    if (!candidate) return;
    setProfileForm({
      name: candidate.name,
      birthdate: candidate.birthdate ? candidate.birthdate.slice(0, 10) : '',
      email: candidate.email ?? '',
      phone: candidate.phone ?? '',
      alternatePhone: candidate.alternatePhone ?? '',
      country: candidate.country ?? '',
      passportNumber: candidate.passportNumber ?? '',
      passportExpiry: candidate.passportExpiry ? candidate.passportExpiry.slice(0, 10) : '',
      currentLocation: candidate.currentLocation ?? '',
      availability: candidate.availability ?? '',
      visaStatus: candidate.visaStatus ?? '',
      profession: candidate.profession ?? '',
      experienceYears: String(candidate.experienceYears ?? 0),
      skills: candidate.skills.join(', '),
    });
  }, [candidate?.birthdate, candidate?.id, candidate?.name, candidate?.email, candidate?.phone, candidate?.alternatePhone, candidate?.country, candidate?.passportNumber, candidate?.passportExpiry, candidate?.currentLocation, candidate?.availability, candidate?.visaStatus, candidate?.profession, candidate?.experienceYears, candidate?.skills]);

  const saveOwnProfile = async () => {
    if (!candidate) return;
    const experienceYears = Number(profileForm.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      setError('Experience years must be a whole number between 0 and 60.');
      return;
    }
    if (profileForm.name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = developmentMode
        ? {
            ...candidate,
            name: profileForm.name.trim(),
            birthdate: profileForm.birthdate.trim() || null,
            email: profileForm.email.trim() || null,
            phone: profileForm.phone.trim() || null,
            alternatePhone: profileForm.alternatePhone.trim() || null,
            country: profileForm.country.trim() || null,
            passportNumber: profileForm.passportNumber.trim() || null,
            passportExpiry: profileForm.passportExpiry.trim() || null,
            currentLocation: profileForm.currentLocation.trim() || null,
            availability: profileForm.availability.trim() || null,
            visaStatus: profileForm.visaStatus.trim() || null,
            profession: profileForm.profession.trim() || null,
            experienceYears,
            skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
            onboardingStatus: 'SUBMITTED' as const,
          }
        : await apiFetch<Candidate>('/candidates/' + candidate.id, {
            method: 'PATCH',
            body: JSON.stringify({
              name: profileForm.name.trim(),
              birthdate: profileForm.birthdate.trim() || null,
              email: profileForm.email.trim() || null,
              phone: profileForm.phone.trim() || null,
              alternatePhone: profileForm.alternatePhone.trim() || null,
              country: profileForm.country.trim() || null,
              passportNumber: profileForm.passportNumber.trim() || null,
              passportExpiry: profileForm.passportExpiry.trim() || null,
              currentLocation: profileForm.currentLocation.trim() || null,
              availability: profileForm.availability.trim() || null,
              visaStatus: profileForm.visaStatus.trim() || null,
              profession: profileForm.profession.trim() || null,
              experienceYears,
              skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
              onboardingStatus: 'SUBMITTED',
            }),
          });

      if (developmentMode) dispatch({ type: 'UPDATE_CANDIDATE', candidate: updated });
      setCandidates((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSuccessTitle('Profile saved');
      setSuccess('Your candidate profile has been updated.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your candidate profile.');
    } finally {
      setSaving(false);
    }
  };

  const filterOptions = useMemo(() => ({
    countries: [...new Set(candidates.map((item) => item.country).filter(Boolean))].sort((a, b) => a!.localeCompare(b!)) as string[],
    professions: [...new Set(candidates.map((item) => item.profession).filter(Boolean))].sort((a, b) => a!.localeCompare(b!)) as string[],
    availabilities: [...new Set(candidates.map((item) => item.availability).filter(Boolean))].sort((a, b) => a!.localeCompare(b!)) as string[],
    visaStatuses: [...new Set(candidates.map((item) => item.visaStatus).filter(Boolean))].sort((a, b) => a!.localeCompare(b!)) as string[],
    locations: [...new Set(candidates.map((item) => item.currentLocation).filter(Boolean))].sort((a, b) => a!.localeCompare(b!)) as string[],
  }), [candidates]);

  const passportMatches = (candidate: Candidate): boolean => {
    if (!passportFilter) return true;
    if (!candidate.passportExpiry) return passportFilter === 'missing';
    const expiry = new Date(candidate.passportExpiry).getTime();
    const now = Date.now();
    if (passportFilter === 'expired') return expiry < now;
    if (passportFilter === '30d') return expiry >= now && expiry <= now + 30 * 86_400_000;
    if (passportFilter === '90d') return expiry >= now && expiry <= now + 90 * 86_400_000;
    if (passportFilter === 'valid') return expiry > now + 90 * 86_400_000;
    return true;
  };

  const filteredCandidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return candidates.filter((item) => {
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesCountry = !countryFilter || item.country === countryFilter;
      const matchesProfession = !professionFilter || item.profession === professionFilter;
      const matchesAvailability = !availabilityFilter || item.availability === availabilityFilter;
      const matchesVisa = !visaStatusFilter || item.visaStatus === visaStatusFilter;
      const matchesLocation = !locationFilter || item.currentLocation === locationFilter;
      const matchesPassport = passportMatches(item);
      const matchesAgency = role !== 'ADMIN' || item.agencyId === agencyId || !agencyId;
      const matchesQuery = !query || [
        item.name,
        item.reference,
        item.email ?? '',
        item.phone ?? '',
        item.alternatePhone ?? '',
        item.passportNumber ?? '',
        item.passportExpiry ?? '',
        item.country ?? '',
        item.currentLocation ?? '',
        item.profession ?? '',
        item.availability ?? '',
        item.visaStatus ?? '',
        item.skills.join(' '),
        item.status,
        item.onboardingStatus,
      ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesCountry && matchesProfession && matchesAvailability && matchesVisa && matchesLocation && matchesPassport && matchesAgency && matchesQuery;
    });
  }, [agencyId, availabilityFilter, candidates, countryFilter, locationFilter, passportFilter, professionFilter, role, search, statusFilter, visaStatusFilter]);

  const sortedCandidates = useMemo(() => {
    const sorted = [...filteredCandidates];
    const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    sorted.sort((left, right) => {
      let result = 0;
      if (sortBy === 'name') result = compareText(left.name, right.name);
      if (sortBy === 'profession') result = compareText(left.profession ?? '', right.profession ?? '');
      if (sortBy === 'experience') result = (left.experienceYears ?? -1) - (right.experienceYears ?? -1);
      if (sortBy === 'passport') result = compareText(left.passportNumber ?? '', right.passportNumber ?? '');
      if (sortBy === 'status') result = compareText(left.status, right.status);
      return sortDirection === 'asc' ? result : -result;
    });
    return sorted;
  }, [filteredCandidates, sortBy, sortDirection]);

  const candidateTotalPages = Math.max(1, Math.ceil(sortedCandidates.length / CANDIDATES_PAGE_SIZE));
  const activeCandidatePage = Math.min(candidatePage, candidateTotalPages);
  const paginatedCandidates = useMemo(
    () => sortedCandidates.slice((activeCandidatePage - 1) * CANDIDATES_PAGE_SIZE, activeCandidatePage * CANDIDATES_PAGE_SIZE),
    [activeCandidatePage, sortedCandidates],
  );

  useEffect(() => {
    setCandidatePage(1);
  }, [agencyId, availabilityFilter, countryFilter, locationFilter, passportFilter, professionFilter, role, search, sortBy, sortDirection, statusFilter, visaStatusFilter]);

  const createCandidate = async () => {
    if (form.name.trim().length < 2) { setError('Candidate name must be at least 2 characters.'); return; }
    if (!developmentMode && !agencyId) { setError('Select an agency workspace.'); return; }
    setSaving(true);
    setError('');
    try {
      const draft: Candidate = {
        id: 'candidate-' + Date.now(), agencyId: agencyId || 'agency-1', reference: 'CA-' + String(candidates.length + 1).padStart(4, '0'),
        name: form.name.trim(),
        birthdate: form.birthdate.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        alternatePhone: form.alternatePhone.trim() || null,
        country: form.country.trim() || null,
        passportNumber: form.passportNumber.trim() || null,
        passportExpiry: form.passportExpiry.trim() || null,
        currentLocation: form.currentLocation.trim() || null,
        availability: form.availability.trim() || null,
        visaStatus: form.visaStatus.trim() || null,
        profession: form.profession.trim() || null,
        experienceYears: Math.max(0, Number(form.experienceYears) || 0),
        skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
        onboardingStatus: 'NOT_STARTED', source: 'AGENCY_ADDED', status: 'POOL', statusUpdatedAt: new Date().toISOString(),
      };
      const created = developmentMode ? draft : await apiFetch<Candidate>('/agencies/' + agencyId + '/candidates', { method: 'POST', body: JSON.stringify({ name: draft.name, birthdate: draft.birthdate, email: draft.email, phone: draft.phone, alternatePhone: draft.alternatePhone, country: draft.country, passportNumber: draft.passportNumber, passportExpiry: draft.passportExpiry, currentLocation: draft.currentLocation, availability: draft.availability, visaStatus: draft.visaStatus, profession: draft.profession, experienceYears: draft.experienceYears, skills: draft.skills }) });
      if (developmentMode) dispatch({ type: 'CREATE_CANDIDATE', candidate: created });
      setCandidates((current) => [created, ...current]);
      setForm(emptyForm);
      setShowForm(false);
      setSuccessTitle('Candidate added');
      setSuccess('"' + created.name + '" is now in the candidate pool.');
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to create the candidate.'); }
    finally { setSaving(false); }
  };

  const downloadCsvTemplate = () => {
    const csv = 'name,birthdate,email,phone,alternatePhone,country,passportNumber,passportExpiry,currentLocation,availability,visaStatus,profession,experienceYears,skills\nExample Candidate,1990-01-15,example@example.com,+94 77 000 0000,+94 76 000 0000,Sri Lanka,N1234567,2031-12-31,Colombo,Immediately,Required,Mason,5,"Masonry,Tile,Plaster"\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'buildhire-candidate-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importCandidates = async (file: File, targetAgencyId: string): Promise<boolean> => {
    if (!targetAgencyId) {
      setError('Select an agency workspace before importing candidates.');
      return false;
    }
    if (file.size > 2_000_000) {
      setError('CSV must be 2 MB or smaller.');
      return false;
    }

    setBulkImporting(true);
    setError('');
    setSuccess('');
    try {
      const csv = await file.text();
      if (developmentMode) {
        const rows = parseCsvRows(csv);
        if (rows.length < 2) throw new Error('CSV must contain a header row and at least one candidate row.');
        const header = rows[0].map((item, index) => (index === 0 ? item.replace(/^\uFEFF/, '') : item).trim().toLowerCase());
        const indexOf = (...names: string[]) => names.map((name) => header.indexOf(name)).find((index) => index >= 0) ?? -1;
        const read = (values: string[], ...names: string[]) => {
          const index = indexOf(...names);
          return index >= 0 ? values[index]?.trim() ?? '' : '';
        };
        if (indexOf('name') < 0) throw new Error('CSV must contain a name column.');
        const created: Candidate[] = rows.slice(1).map((values, index) => {
          const experienceRaw = read(values, 'experienceyears', 'experience');
          const experienceYears = experienceRaw ? Number(experienceRaw) : null;
          const birthdate = read(values, 'birthdate', 'birth_date', 'dateofbirth', 'date_of_birth', 'dob');
          return {
            id: 'candidate-import-' + Date.now() + '-' + index,
            agencyId: targetAgencyId,
            reference: 'CA-' + String(candidates.length + index + 1).padStart(4, '0'),
            name: read(values, 'name') || 'Imported Candidate ' + (index + 1),
            birthdate: birthdate || null,
            email: read(values, 'email') || null,
            phone: read(values, 'phone', 'contactnumber', 'contact_number') || null,
            alternatePhone: read(values, 'alternatephone', 'alternate_phone') || null,
            country: read(values, 'country', 'nationality') || null,
            passportNumber: read(values, 'passportnumber', 'passport_number') || null,
            passportExpiry: read(values, 'passportexpiry', 'passport_expiry') || null,
            currentLocation: read(values, 'currentlocation', 'current_location', 'location') || null,
            availability: read(values, 'availability') || null,
            visaStatus: read(values, 'visastatus', 'visa_status') || null,
            profession: read(values, 'profession') || null,
            experienceYears: Number.isFinite(experienceYears) ? experienceYears : null,
            skills: read(values, 'skills').split(/[,;|]/).map((item) => item.trim()).filter(Boolean),
            onboardingStatus: 'NOT_STARTED',
            source: 'BULK_IMPORTED',
            status: 'POOL',
            statusUpdatedAt: new Date().toISOString(),
          };
        });
        created.forEach((candidate) => dispatch({ type: 'CREATE_CANDIDATE', candidate }));
        setCandidates((current) => [...created, ...current]);
        setSuccessTitle('Candidates imported');
        setSuccess(created.length + ' candidate(s) were added to the candidate pool.');
      } else {
        const result = await apiFetch<{ importedCount: number; candidates: Candidate[] }>('/agencies/' + targetAgencyId + '/candidates/bulk', {
          method: 'POST',
          headers: { 'content-type': 'text/csv' },
          body: csv,
        });
        setCandidates((current) => [...result.candidates, ...current]);
        setSuccessTitle('Candidates imported');
        setSuccess(result.importedCount + ' candidate(s) were added to the candidate pool.');
      }
      return true;
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to import the CSV.');
      return false;
    } finally {
      setBulkImporting(false);
      if (bulkFileRef.current) bulkFileRef.current.value = '';
    }
  };

  const openImportModal = () => {
    setImportAgencyId(role === 'ADMIN' ? '' : agencyId);
    setImportFile(null);
    setShowImportModal(true);
    setError('');
  };

  const closeImportModal = () => {
    if (bulkImporting) return;
    setShowImportModal(false);
    setImportAgencyId('');
    setImportFile(null);
    setError('');
    if (bulkFileRef.current) bulkFileRef.current.value = '';
  };

  const proceedImport = async () => {
    if (!importAgencyId) {
      setError('Select an agency before importing the CSV.');
      return;
    }
    if (!importFile) {
      setError('Select a CSV file before continuing.');
      return;
    }
    const imported = await importCandidates(importFile, importAgencyId);
    if (imported) {
      setShowImportModal(false);
      setImportFile(null);
      if (bulkFileRef.current) bulkFileRef.current.value = '';
    }
  };

  const saveManagedProfile = async () => {
    if (!candidate) return;
    const experienceYears = Number(profileForm.experienceYears);
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      setError('Experience years must be a whole number between 0 and 60.');
      return;
    }
    if (profileForm.name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const updated = developmentMode
        ? {
            ...candidate,
            name: profileForm.name.trim(),
            birthdate: profileForm.birthdate.trim() || null,
            email: profileForm.email.trim() || null,
            phone: profileForm.phone.trim() || null,
            alternatePhone: profileForm.alternatePhone.trim() || null,
            country: profileForm.country.trim() || null,
            passportNumber: profileForm.passportNumber.trim() || null,
            passportExpiry: profileForm.passportExpiry.trim() || null,
            currentLocation: profileForm.currentLocation.trim() || null,
            availability: profileForm.availability.trim() || null,
            visaStatus: profileForm.visaStatus.trim() || null,
            profession: profileForm.profession.trim() || null,
            experienceYears,
            skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
          }
        : await apiFetch<Candidate>('/candidates/' + candidate.id, {
            method: 'PATCH',
            body: JSON.stringify({
              name: profileForm.name.trim(),
              birthdate: profileForm.birthdate.trim() || null,
              email: profileForm.email.trim() || null,
              phone: profileForm.phone.trim() || null,
              alternatePhone: profileForm.alternatePhone.trim() || null,
              country: profileForm.country.trim() || null,
              passportNumber: profileForm.passportNumber.trim() || null,
              passportExpiry: profileForm.passportExpiry.trim() || null,
              currentLocation: profileForm.currentLocation.trim() || null,
              availability: profileForm.availability.trim() || null,
              visaStatus: profileForm.visaStatus.trim() || null,
              profession: profileForm.profession.trim() || null,
              experienceYears,
              skills: profileForm.skills.split(',').map((item) => item.trim()).filter(Boolean),
            }),
          });

      if (developmentMode) dispatch({ type: 'UPDATE_CANDIDATE', candidate: updated });
      setCandidates((items) => items.map((item) => item.id === updated.id ? updated : item));
      setEditingCandidateProfile(false);
      setSuccessTitle('Candidate profile updated');
      setSuccess('"' + updated.name + '" profile details were saved.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update the candidate profile.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async () => {
    if (!candidate || !statusDraft || statusDraft === candidate.status) return;
    setSaving(true);
    setError('');
    try {
      const updated = developmentMode ? { ...candidate, status: statusDraft, statusUpdatedAt: new Date().toISOString() } : await apiFetch<Candidate>('/candidates/' + candidate.id, { method: 'PATCH', body: JSON.stringify({ status: statusDraft, statusReason: statusReason.trim() || null }) });
      if (developmentMode) dispatch({ type: 'SET_CANDIDATE_STATUS', candidateId: candidate.id, status: statusDraft });
      setCandidates((current) => current.map((item) => item.id === updated.id ? updated : item));
      setStatusDraft(updated.status);
      setStatusReason('');
      setSuccessTitle('Candidate status updated');
      setSuccess('"' + updated.name + '" is now ' + label(updated.status) + '.');
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to update candidate status.'); }
    finally { setSaving(false); }
  };

  const updateOnboarding = async (item: Candidate, next: OnboardingStatus = 'COMPLETED') => {
    try {
      const updated = developmentMode ? { ...item, onboardingStatus: next } : await apiFetch<Candidate>('/candidates/' + item.id, { method: 'PATCH', body: JSON.stringify({ onboardingStatus: next }) });
      if (developmentMode) dispatch({ type: 'SET_ONBOARDING_STATUS', candidateId: item.id, status: next });
      setCandidates((current) => current.map((candidateItem) => candidateItem.id === updated.id ? updated : candidateItem));
      setSuccessTitle('Onboarding updated');
      setSuccess('"' + item.name + '" is now ' + label(next) + '.');
    } catch (requestError: unknown) { setError(requestError instanceof Error ? requestError.message : 'Unable to update onboarding status.'); }
  };

  const displayPassport = (value: string | null) => value?.trim() || 'Not provided';

  const columns = [
    { key: 'candidate', header: 'Candidate', render: (item: Candidate) => <div><p className="font-bold text-slate-900">{item.name}</p><p className="mt-1 text-[11px] text-slate-400">{item.reference} · {item.profession ?? 'Profession not set'}</p><p className="mt-1 text-[10px] text-slate-400">Birthdate: {item.birthdate ? new Date(item.birthdate).toLocaleDateString() : 'Not provided'}</p></div> },
    { key: 'contact', header: 'Contact', render: (item: Candidate) => <div><p className="text-xs font-semibold text-slate-700">{item.phone ?? 'No contact number'}</p><p className="mt-1 text-[10px] text-slate-400">{item.country ?? 'Country not set'}</p></div> },
    { key: 'passport', header: 'Passport', render: (item: Candidate) => <span className="text-xs font-semibold text-slate-700">{item.passportNumber ?? 'Not provided'}</span> },
    { key: 'experience', header: 'Experience', render: (item: Candidate) => <span className="text-slate-600">{item.experienceYears ?? 0} years</span> },
    { key: 'status', header: 'Status', render: (item: Candidate) => <StatusPill value={item.status} /> },
    { key: 'onboarding', header: 'Onboarding', render: (item: Candidate) => <StatusPill value={item.onboardingStatus} /> },
    { key: 'actions', header: '', className: 'text-right', render: (item: Candidate) => <Button size="sm" variant="secondary" className="px-2.5" onClick={() => { setSelectedCandidateId(item.id); setEditingCandidateProfile(false); setActiveDetailTab('overview'); }}>Open</Button> },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={role === 'ADMIN' ? 'All agency workspaces' : role === 'INTERVIEWEE' ? 'Candidate profile' : 'Candidate pool'}
        title={role === 'INTERVIEWEE' ? 'My Profile' : 'Candidates'}
        description={role === 'INTERVIEWEE' ? 'Maintain your candidate profile and documents.' : 'Candidates enter the system once and remain in the pool throughout their recruitment history. Interviews are assigned directly to candidates.'}
        action={role !== 'INTERVIEWEE' ? (
          <div className="flex items-center gap-2">
            <button type="button" title="Download CSV template" aria-label="Download CSV template" className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50" onClick={downloadCsvTemplate}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14" />
              </svg>
            </button>
            <button type="button" title="Import candidates from CSV" aria-label="Import candidates from CSV" className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300" disabled={bulkImporting} onClick={openImportModal}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 21V10m0 0-4 4m4-4 4 4M5 5h9l5 5v9H5z" />
                <path d="M14 5v5h5" />
              </svg>
            </button>
            <Button onClick={() => { setForm(emptyForm); setShowForm(true); setError(''); }}>New candidate</Button>
          </div>
        ) : undefined}
      />


      {error && <StateMessage kind="error" title="Candidate action failed" description={error} floating={candidateFormModalOpen || showImportModal} />}
      {success && <StateMessage kind="success" title={successTitle} description={success} />}
      {loading && <StateMessage kind="loading" title="Loading candidates" description="Fetching the candidate pool." />}

      {candidateFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button type="button" aria-label="Close new candidate dialog" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setShowForm(false)} />
          <div ref={candidateFormModalRef} role="dialog" aria-modal="true" aria-labelledby="new-candidate-title" tabIndex={-1} className="relative z-10 my-auto w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-4rem)] sm:p-5">
                      <h2 className="text-sm font-black text-slate-950"><span id="new-candidate-title">Add candidate to pool</span></h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <FormField label="Full name"><input className="field-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" /></FormField>
            <FormField label="Birthdate"><input type="date" className="field-input" value={form.birthdate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setForm({ ...form, birthdate: event.target.value })} /></FormField>
            <FormField label="Country / nationality"><input className="field-input" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} placeholder="Sri Lanka" /></FormField>
            <FormField label="Contact number"><input className="field-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} autoComplete="tel" /></FormField>
            <FormField label="Alternate contact number"><input className="field-input" value={form.alternatePhone} onChange={(event) => setForm({ ...form, alternatePhone: event.target.value })} autoComplete="tel" /></FormField>
            <FormField label="Email"><input type="email" className="field-input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></FormField>
            <FormField label="Passport number"><input className="field-input" value={form.passportNumber} onChange={(event) => setForm({ ...form, passportNumber: event.target.value })} placeholder="Passport number" /></FormField>
            <FormField label="Passport expiry"><input type="date" className="field-input" value={form.passportExpiry} onChange={(event) => setForm({ ...form, passportExpiry: event.target.value })} /></FormField>
            <FormField label="Current location"><input className="field-input" value={form.currentLocation} onChange={(event) => setForm({ ...form, currentLocation: event.target.value })} placeholder="Colombo, Sri Lanka" /></FormField>
            <FormField label="Availability"><select className="field-input" value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })}><option value="">Select availability</option><option value="Immediately">Immediately</option><option value="Within 2 weeks">Within 2 weeks</option><option value="Within 1 month">Within 1 month</option><option value="Not available">Not available</option></select></FormField>
            <FormField label="Visa / work status"><select className="field-input" value={form.visaStatus} onChange={(event) => setForm({ ...form, visaStatus: event.target.value })}><option value="">Select status</option><option value="Available">Available</option><option value="Required">Required</option><option value="In process">In process</option><option value="Expired">Expired</option><option value="Not applicable">Not applicable</option></select></FormField>
            <FormField label="Profession"><input className="field-input" value={form.profession} onChange={(event) => setForm({ ...form, profession: event.target.value })} /></FormField>
            <FormField label="Experience years"><input type="number" min="0" max="60" className="field-input" value={form.experienceYears} onChange={(event) => setForm({ ...form, experienceYears: event.target.value })} /></FormField>
            {role === 'ADMIN' && <FormField label="Agency workspace"><select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)}><option value="">Select an agency</option>{agencies.filter((item) => item.status === 'ACTIVE').map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}</select></FormField>}
            <div className="md:col-span-2"><FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} placeholder="Masonry, Tile, Plaster" /></FormField></div>
          </div>
          <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button><Button disabled={saving || !agencyId} onClick={() => void createCandidate()}>{saving ? 'Saving…' : 'Add to pool'}</Button></div>

          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button
            type="button"
            aria-label="Close import candidates dialog"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={closeImportModal}
          />
          <div
            ref={importModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-candidates-title"
            tabIndex={-1}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Bulk onboarding</p>
                <h2 id="import-candidates-title" className="mt-1 text-lg font-black text-slate-950">Import candidates</h2>
                <p className="mt-1 text-xs text-slate-500">Choose where the candidates belong, then select the CSV file.</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700">1 Agency</span>
                  <span className="text-slate-300">→</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">2 CSV file</span>
                </div>
              </div>
              <button type="button" aria-label="Close" className="grid size-9 shrink-0 place-items-center rounded-xl text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={closeImportModal}>×</button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="field-label">Agency</label>
                <select className="field-input mt-1 w-full" value={importAgencyId} onChange={(event) => setImportAgencyId(event.target.value)} disabled={role !== 'ADMIN'}>
                  <option value="">Select an agency</option>
                  {agencies.filter((item) => item.status === 'ACTIVE').map((agency) => (
                    <option key={agency.id} value={agency.id}>{agency.name}</option>
                  ))}
                  {role !== 'ADMIN' && agencyId && !agencies.some((item) => item.id === agencyId) && (
                    <option value={agencyId}>Current agency</option>
                  )}
                </select>
                {role !== 'ADMIN' && <p className="mt-1 text-[10px] text-slate-400">Your account is limited to its assigned agency.</p>}
                {role === 'ADMIN' && <p className="mt-1 text-[10px] text-slate-400">Imported candidates will be created under the selected agency.</p>}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="field-label">CSV file</label>
                  <span className="text-[10px] text-slate-400">Max 2 MB</span>
                </div>
                <label className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition hover:border-cyan-300 hover:bg-cyan-50/30">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M12 16V4m0 0 4 4m-4-4L8 8" />
                    <path d="M5 12v7h14v-7" />
                  </svg>
                  <span className="mt-2 text-xs font-bold text-slate-700">{importFile ? 'Change selected file' : 'Choose a CSV file'}</span>
                  <span className="mt-1 text-[10px] text-slate-400">CSV format only</span>
                  <input
                    ref={bulkFileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                    disabled={bulkImporting}
                  />
                </label>
                {importFile && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-700">{importFile.name}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{(importFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    {!bulkImporting && <button type="button" className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-800" onClick={() => { setImportFile(null); if (bulkFileRef.current) bulkFileRef.current.value = ''; }}>Remove</button>}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={closeImportModal} disabled={bulkImporting}>Cancel</Button>
              <Button onClick={() => void proceedImport()} disabled={bulkImporting || !importAgencyId || !importFile}>
                {bulkImporting ? 'Importing…' : 'Proceed with import'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {role === 'INTERVIEWEE' ? (
        candidate ? (
          <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
            <Card>
              <div className="grid size-16 place-items-center rounded-2xl bg-cyan-50 text-lg font-black text-cyan-700">{candidate.name.slice(0, 2).toUpperCase()}</div>
              <h2 className="mt-4 text-xl font-black text-slate-950">{candidate.name}</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Birthdate: {candidate.birthdate ? new Date(candidate.birthdate).toLocaleDateString() : 'Not provided'}</p>
              <p className="mt-1 text-sm text-slate-500">{candidate.profession ?? 'Profession not set'}</p>
              <div className="mt-5 flex flex-wrap gap-2"><StatusPill value={candidate.status} /><StatusPill value={candidate.onboardingStatus} /></div>
              <p className="mt-4 text-xs text-slate-500">Reference <span className="font-bold text-slate-800">{candidate.reference}</span></p>
            </Card>
            <Card>
              <h2 className="text-sm font-black text-slate-950">Profile details</h2>
              <p className="mt-1 text-xs text-slate-400">Keep your contact, passport, location, work status, profession, experience, and skills up to date.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField label="Full name"><input className="field-input" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} autoComplete="name" /></FormField>
                <FormField label="Birthdate"><input type="date" className="field-input" value={profileForm.birthdate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setProfileForm({ ...profileForm, birthdate: event.target.value })} /></FormField>
                <FormField label="Country / nationality"><input className="field-input" value={profileForm.country} onChange={(event) => setProfileForm({ ...profileForm, country: event.target.value })} /></FormField>
                <FormField label="Contact number"><input className="field-input" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} autoComplete="tel" /></FormField>
                <FormField label="Alternate contact number"><input className="field-input" value={profileForm.alternatePhone} onChange={(event) => setProfileForm({ ...profileForm, alternatePhone: event.target.value })} autoComplete="tel" /></FormField>
                <FormField label="Email"><input type="email" className="field-input" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} autoComplete="email" /></FormField>
                <FormField label="Passport number"><input className="field-input" value={profileForm.passportNumber} onChange={(event) => setProfileForm({ ...profileForm, passportNumber: event.target.value })} /></FormField>
                <FormField label="Passport expiry"><input type="date" className="field-input" value={profileForm.passportExpiry} onChange={(event) => setProfileForm({ ...profileForm, passportExpiry: event.target.value })} /></FormField>
                <FormField label="Current location"><input className="field-input" value={profileForm.currentLocation} onChange={(event) => setProfileForm({ ...profileForm, currentLocation: event.target.value })} /></FormField>
                <FormField label="Availability"><input className="field-input" value={profileForm.availability} onChange={(event) => setProfileForm({ ...profileForm, availability: event.target.value })} placeholder="Immediately / Within 2 weeks" /></FormField>
                <FormField label="Visa / work status"><input className="field-input" value={profileForm.visaStatus} onChange={(event) => setProfileForm({ ...profileForm, visaStatus: event.target.value })} placeholder="Available / Required / In process" /></FormField>
                <FormField label="Profession"><input className="field-input" value={profileForm.profession} onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })} placeholder="Mason, Welder…" /></FormField>
                <FormField label="Experience years"><input type="number" min="0" max="60" className="field-input" value={profileForm.experienceYears} onChange={(event) => setProfileForm({ ...profileForm, experienceYears: event.target.value })} /></FormField>
                <div className="sm:col-span-2"><FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={profileForm.skills} onChange={(event) => setProfileForm({ ...profileForm, skills: event.target.value })} /></FormField></div>
              </div>
              <div className="mt-5 flex justify-end"><Button disabled={saving} onClick={() => void saveOwnProfile()}>{saving ? 'Saving…' : 'Save profile'}</Button></div>
              <div className="mt-6 border-t border-slate-100 pt-6"><CandidateDocumentsPanel candidateId={candidate.id} apiEnabled={!developmentMode} /></div>
            </Card>
          </div>
        ) : <StateMessage kind="empty" title="Profile not linked" description="This account is not linked to a candidate profile yet." />
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="min-w-0">
                <label className="field-label">Search candidates</label>
                <input
                  className="field-input mt-1 w-full"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, reference, passport, contact, location or skill…"
                />
              </div>

              <button
                type="button"
                className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm md:hidden"
                aria-expanded={mobileFiltersOpen}
                aria-controls="mobile-candidate-filters"
                onClick={() => setMobileFiltersOpen((value) => !value)}
              >
                <span>{mobileFiltersOpen ? 'Hide filters' : 'More filters'}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={mobileFiltersOpen ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
                </svg>
              </button>

              {role === 'ADMIN' && (
                <div id="mobile-candidate-filters" className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
                  <label className="field-label">Agency</label>
                  <SelectMenu
                    value={agencyId}
                    onChange={setAgencyId}
                    options={[
                      { value: '', label: 'All agencies' },
                      ...agencies.filter((item) => item.status === 'ACTIVE').map((agency) => ({ value: agency.id, label: agency.name })),
                    ]}
                    ariaLabel="Filter by agency"
                    className="mt-1"
                  />
                </div>
              )}

              <div className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
                <label className="field-label">Status</label>
                <SelectMenu
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: '', label: 'All statuses' },
                    ...statusOptions.map((status) => ({ value: status, label: label(status) })),
                  ]}
                  ariaLabel="Filter by candidate status"
                  className="mt-1"
                />
              </div>

              <div className={mobileFiltersOpen ? 'min-w-0' : 'hidden min-w-0 md:block'}>
                <label className="field-label">Sort</label>
                <div className="mt-1 flex min-w-0 gap-1.5">
                  <SelectMenu
                    value={sortBy}
                    onChange={(value) => setSortBy(value as typeof sortBy)}
                    options={[
                      { value: 'name', label: 'Name' },
                      { value: 'profession', label: 'Profession' },
                      { value: 'experience', label: 'Experience' },
                      { value: 'passport', label: 'Passport' },
                      { value: 'status', label: 'Status' },
                    ]}
                    ariaLabel="Sort candidates by"
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    title={sortDirection === 'asc' ? 'Ascending order' : 'Descending order'}
                    aria-label={sortDirection === 'asc' ? 'Switch to descending sort' : 'Switch to ascending sort'}
                    className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                    onClick={() => setSortDirection((value) => value === 'asc' ? 'desc' : 'asc')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                      {sortDirection === 'asc'
                        ? <path d="M12 19V5m0 0-5 5m5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        : <path d="M12 5v14m0 0-5-5m5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  <div>
                    <label className="field-label">Country</label>
                    <SelectMenu
                      value={countryFilter}
                      onChange={setCountryFilter}
                      options={[
                        { value: '', label: 'All countries' },
                        ...filterOptions.countries.map((value) => ({ value, label: value })),
                      ]}
                      ariaLabel="Filter by country"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="field-label">Profession</label>
                    <SelectMenu
                      value={professionFilter}
                      onChange={setProfessionFilter}
                      options={[
                        { value: '', label: 'All professions' },
                        ...filterOptions.professions.map((value) => ({ value, label: value })),
                      ]}
                      ariaLabel="Filter by profession"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="field-label">Availability</label>
                    <SelectMenu
                      value={availabilityFilter}
                      onChange={setAvailabilityFilter}
                      options={[
                        { value: '', label: 'Any availability' },
                        ...filterOptions.availabilities.map((value) => ({ value, label: value })),
                      ]}
                      ariaLabel="Filter by availability"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="field-label">Visa / work status</label>
                    <SelectMenu
                      value={visaStatusFilter}
                      onChange={setVisaStatusFilter}
                      options={[
                        { value: '', label: 'Any visa status' },
                        ...filterOptions.visaStatuses.map((value) => ({ value, label: value })),
                      ]}
                      ariaLabel="Filter by visa or work status"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="field-label">Location</label>
                    <SelectMenu
                      value={locationFilter}
                      onChange={setLocationFilter}
                      options={[
                        { value: '', label: 'All locations' },
                        ...filterOptions.locations.map((value) => ({ value, label: value })),
                      ]}
                      ariaLabel="Filter by location"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="field-label">Passport expiry</label>
                    <SelectMenu
                      value={passportFilter}
                      onChange={setPassportFilter}
                      options={[
                        { value: '', label: 'Any passport status' },
                        { value: 'expired', label: 'Expired' },
                        { value: '30d', label: 'Expires in 30 days' },
                        { value: '90d', label: 'Expires in 90 days' },
                        { value: 'valid', label: 'Valid beyond 90 days' },
                        { value: 'missing', label: 'Missing expiry' },
                      ]}
                      ariaLabel="Filter by passport expiry"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className={mobileFiltersOpen ? 'flex items-center gap-2' : 'hidden items-center gap-2 md:flex'}>
                <button
                  type="button"
                  title={showAdvancedFilters ? 'Hide advanced filters' : 'More filters'}
                  aria-label={showAdvancedFilters ? 'Hide advanced filters' : 'More filters'}
                  className={`grid size-10 place-items-center rounded-xl border transition ${showAdvancedFilters ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  onClick={() => setShowAdvancedFilters((value) => !value)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 6h16M7 12h10M10 18h4" />
                  </svg>
                </button>
                <span className="text-[10px] font-bold text-slate-400">
                  {showAdvancedFilters ? 'Advanced filters' : 'More filters'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <p className="text-xs text-slate-500"><span className="font-black text-slate-800">{filteredCandidates.length}</span> candidate(s)</p>

                {(search || statusFilter || countryFilter || professionFilter || availabilityFilter || visaStatusFilter || locationFilter || passportFilter) && (
                  <button
                    type="button"
                    title="Clear filters"
                    aria-label="Clear filters"
                    className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('');
                      setCountryFilter('');
                      setProfessionFilter('');
                      setAvailabilityFilter('');
                      setVisaStatusFilter('');
                      setLocationFilter('');
                      setPassportFilter('');
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 6h18M6 12h12M10 18h4" />
                      <path d="M7 6l1-2h8l1 2" />
                    </svg>
                  </button>
                )}

                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Candidate list view">
                  <button
                    type="button"
                    aria-label="Card view"
                    aria-pressed={listView === 'cards'}
                    title="Card view"
                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${listView === 'cards' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setListView('cards')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="4" width="6" height="6" rx="1" />
                      <rect x="14" y="4" width="6" height="6" rx="1" />
                      <rect x="4" y="14" width="6" height="6" rx="1" />
                      <rect x="14" y="14" width="6" height="6" rx="1" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Table view"
                    aria-pressed={listView === 'table'}
                    title="Table view"
                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${listView === 'table' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setListView('table')}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="4" y="5" width="16" height="14" rx="1" />
                      <path d="M4 10h16M10 5v14" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!loading && listView === 'cards' && sortedCandidates.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {paginatedCandidates.map((item) => {
                const candidateInitial = item.name.trim().charAt(0).toUpperCase() || '?';
                return (
                  <Card key={item.id} padded={false} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-50 text-sm font-black text-cyan-700 ring-1 ring-inset ring-cyan-100">
                        {candidateInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-black text-slate-950">{item.name}</h2>
                            <p className="mt-0.5 truncate text-[10px] font-bold text-cyan-700">{item.reference}</p>
                          </div>
                          <StatusPill value={item.status} />
                        </div>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{item.profession ?? 'Profession not set'}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Experience</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-800">{item.experienceYears ?? 0} years</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2.5">
                        <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Availability</p>
                        <p className="mt-1 truncate text-[11px] font-bold text-slate-800">{item.availability ?? 'Not set'}</p>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                        <span className="text-[10px] font-bold text-slate-400">Contact</span>
                        <span className="max-w-[68%] truncate text-right text-[10px] font-semibold text-slate-600">{item.phone ?? 'No contact number'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                        <span className="text-[10px] font-bold text-slate-400">Location</span>
                        <span className="max-w-[68%] truncate text-right text-[10px] font-semibold text-slate-600">{item.currentLocation ?? item.country ?? 'Not set'}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                        <span className="text-[10px] font-bold text-slate-400">Passport</span>
                        <span className="max-w-[68%] truncate text-right text-[10px] font-semibold text-slate-600">{displayPassport(item.passportNumber)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5">
                        <span className="text-[10px] font-bold text-slate-400">Onboarding</span>
                        <StatusPill value={item.onboardingStatus} />
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="min-h-9 rounded-lg px-3 text-[10px]"
                        onClick={() => { setSelectedCandidateId(item.id); setEditingCandidateProfile(false); setActiveDetailTab('overview'); }}
                      >
                        Open candidate
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && listView === 'table' && (
            <DataTable columns={columns} rows={paginatedCandidates} getRowKey={(item) => item.id} emptyMessage="No candidates match the current filters." />
          )}

          {!loading && (
            <Pagination
              page={activeCandidatePage}
              pageSize={CANDIDATES_PAGE_SIZE}
              total={sortedCandidates.length}
              onPageChange={setCandidatePage}
            />
          )}

          <CandidateProfilePanel
            candidate={profilePanelOpen ? candidate ?? null : null}
            role={role}
            apiEnabled={!developmentMode}
            initialHistory={history}
            initialHistoryLoading={loadingHistory}
            minimized={profilePanelMinimized}
            maximized={profilePanelMaximized}
            onMinimize={() => setProfilePanelMinimized(true)}
            onRestore={() => { setProfilePanelMinimized(false); setProfilePanelMaximized(false); }}
            onMaximize={() => { setProfilePanelMinimized(false); setProfilePanelMaximized((value) => !value); }}
            onClose={() => { setProfilePanelOpen(false); setProfilePanelMinimized(false); setProfilePanelMaximized(false); }}
            onCandidateUpdated={(updated) => {
              setCandidates((items) => items.map((item) => item.id === updated.id ? updated : item));
            }}
          />

          {candidate && selectedCandidateId && (
            <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden p-0 sm:items-center sm:overflow-y-auto sm:p-4" role="presentation">
              <button
                type="button"
                aria-label="Close candidate details"
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
                onClick={() => { setSelectedCandidateId(''); setEditingCandidateProfile(false); setActiveDetailTab('overview'); }}
              />
              <div
                ref={candidateModalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="candidate-details-title"
                tabIndex={-1}
                className="relative z-10 flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:my-auto sm:h-auto sm:max-h-[calc(100dvh-4rem)] sm:rounded-3xl sm:border sm:border-slate-200"
              >
                <header className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Candidate profile</p>
                        <StatusPill value={candidate.status} />
                        <StatusPill value={candidate.onboardingStatus} />
                      </div>
                      <h2 id="candidate-details-title" className="mt-1.5 text-xl font-black tracking-tight text-slate-950 sm:mt-2 sm:text-2xl">{candidate.name}</h2>
                      <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">{candidate.reference} · {candidate.profession ?? 'Profession not set'} · {candidate.experienceYears ?? 0} years</p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                      {candidate.onboardingStatus !== 'COMPLETED' && !editingCandidateProfile && (
                        <Button size="sm" variant="secondary" className="col-span-2 w-full sm:col-span-1 sm:w-auto" disabled={saving} onClick={() => void updateOnboarding(candidate, 'COMPLETED')}>Mark complete</Button>
                      )}
                      <Button size="sm" variant="secondary" className="w-full sm:w-auto" onClick={() => { setProfilePanelOpen(true); setProfilePanelMinimized(false); setProfilePanelMaximized(false); }}>
                        Full profile
                      </Button>
                      <Button size="sm" variant="secondary" className="w-full sm:w-auto" onClick={() => { setEditingCandidateProfile((value) => !value); setActiveDetailTab('overview'); setError(''); }}>
                        {editingCandidateProfile ? 'Close edit' : 'Edit profile'}
                      </Button>
                      <Button size="sm" variant="secondary" className="w-full px-2.5 sm:w-auto" onClick={() => { setSelectedCandidateId(''); setEditingCandidateProfile(false); setActiveDetailTab('overview'); }}><span className="text-base leading-none sm:hidden" aria-hidden="true">×</span><span className="hidden sm:inline">Close</span></Button>
                    </div>
                  </div>

                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-8 sm:px-6 sm:py-6 sm:pb-8">
                  <nav className="sticky top-0 z-20 -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 pb-2 pt-1 backdrop-blur sm:-mx-6 sm:px-6" aria-label="Candidate profile sections">
                    {([
                      ['overview', 'Overview'],
                      ['documents', 'Documents'],
                      ['activity', 'Activity'],
                    ] as const).map(([tab, textLabel]) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveDetailTab(tab)}
                        className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 ${activeDetailTab === tab ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                        aria-current={activeDetailTab === tab ? 'page' : undefined}
                      >
                        {textLabel}
                      </button>
                    ))}
                  </nav>
                  {editingCandidateProfile && activeDetailTab === 'overview' ? (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-black text-slate-950">Edit profile</h3>
                          <p className="mt-1 text-xs text-slate-500">Update the candidate's contact, identity, location, work status, profession, experience, and skills.</p>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 sm:mt-5 md:grid-cols-2">
                        <FormField label="Full name"><input className="field-input" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></FormField>
                        <FormField label="Country / nationality"><input className="field-input" value={profileForm.country} onChange={(event) => setProfileForm({ ...profileForm, country: event.target.value })} /></FormField>
                        <FormField label="Contact number"><input className="field-input" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} /></FormField>
                        <FormField label="Alternate contact number"><input className="field-input" value={profileForm.alternatePhone} onChange={(event) => setProfileForm({ ...profileForm, alternatePhone: event.target.value })} /></FormField>
                        <FormField label="Email"><input type="email" className="field-input" value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></FormField>
                        <FormField label="Passport number"><input className="field-input" value={profileForm.passportNumber} onChange={(event) => setProfileForm({ ...profileForm, passportNumber: event.target.value })} /></FormField>
                        <FormField label="Passport expiry"><input type="date" className="field-input" value={profileForm.passportExpiry} onChange={(event) => setProfileForm({ ...profileForm, passportExpiry: event.target.value })} /></FormField>
                        <FormField label="Current location"><input className="field-input" value={profileForm.currentLocation} onChange={(event) => setProfileForm({ ...profileForm, currentLocation: event.target.value })} /></FormField>
                        <FormField label="Availability"><input className="field-input" value={profileForm.availability} onChange={(event) => setProfileForm({ ...profileForm, availability: event.target.value })} /></FormField>
                        <FormField label="Visa / work status"><input className="field-input" value={profileForm.visaStatus} onChange={(event) => setProfileForm({ ...profileForm, visaStatus: event.target.value })} /></FormField>
                        <FormField label="Profession"><input className="field-input" value={profileForm.profession} onChange={(event) => setProfileForm({ ...profileForm, profession: event.target.value })} /></FormField>
                        <FormField label="Experience years"><input type="number" min="0" max="60" className="field-input" value={profileForm.experienceYears} onChange={(event) => setProfileForm({ ...profileForm, experienceYears: event.target.value })} /></FormField>
                        <div className="md:col-span-2"><FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={profileForm.skills} onChange={(event) => setProfileForm({ ...profileForm, skills: event.target.value })} /></FormField></div>
                      </div>
                      <div className="mt-5 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setEditingCandidateProfile(false)}>Cancel</Button>
                        <Button disabled={saving} onClick={() => void saveManagedProfile()}>{saving ? 'Saving…' : 'Save profile'}</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeDetailTab === 'overview' && (
                        <div className="space-y-7">
                          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-8 sm:gap-y-5">
                            <div><p className="field-label">Contact</p><p className="mt-1 text-sm font-semibold text-slate-800">{candidate.phone ?? 'Not provided'}</p><p className="mt-0.5 text-xs text-slate-400">{candidate.alternatePhone ?? 'No alternate number'}</p></div>
                            <div><p className="field-label">Email</p><p className="mt-1 text-sm font-semibold break-words text-slate-800">{candidate.email ?? 'No email'}</p></div>
                            <div><p className="field-label">Country</p><p className="mt-1 text-sm font-semibold text-slate-800">{candidate.country ?? 'Not set'}</p></div>
                            <div><p className="field-label">Location</p><p className="mt-1 text-sm font-semibold text-slate-800">{candidate.currentLocation ?? 'Not set'}</p></div>
                            <div><p className="field-label">Passport</p><p className="mt-1 text-sm font-semibold text-slate-800">{displayPassport(candidate.passportNumber)}</p><p className="mt-0.5 text-xs text-slate-400">Expires {candidate.passportExpiry ? new Date(candidate.passportExpiry).toLocaleDateString() : 'Not provided'}</p></div>
                            <div><p className="field-label">Work readiness</p><p className="mt-1 text-sm font-semibold text-slate-800">{candidate.availability ?? 'Not set'}</p><p className="mt-0.5 text-xs text-slate-400">{candidate.visaStatus ?? 'Visa status not set'}</p></div>
                            <div><p className="field-label">Skills</p><p className="mt-1 text-sm leading-6 text-slate-600">{candidate.skills.length ? candidate.skills.join(' · ') : 'No skills recorded'}</p></div>
                            <div><p className="field-label">Onboarding</p><div className="mt-1"><StatusPill value={candidate.onboardingStatus} /></div></div>
                            <div><p className="field-label">Reference</p><p className="mt-1 text-sm font-semibold text-slate-800">{candidate.reference}</p></div>
                          </div>

                          <section className="border-t border-slate-200 pt-5 sm:pt-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <div>
                                <h3 className="text-sm font-black text-slate-950">Lifecycle status</h3>
                                <p className="mt-1 text-xs text-slate-500">Update the recruitment stage and record an optional reason.</p>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                <div>
                                  <label className="field-label">Status</label>
                                  <select className="field-input mt-1 w-full sm:min-w-48" value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as CandidateStatus)}>
                                    {statusOptions.filter((status) => {
                                      const hasCompletedInterview = history.interviews.some((interview) => interview.status === 'COMPLETED');
                                      return !finalStatusOptions.includes(status) || hasCompletedInterview || status === candidate.status;
                                    }).map((status) => <option key={status} value={status}>{label(status)}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label className="field-label">Reason</label>
                                  <input className="field-input mt-1 w-full sm:min-w-56" value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Optional decision note" />
                                </div>
                                <Button className="w-full sm:w-auto" disabled={saving || !statusDraft || statusDraft === candidate.status} onClick={() => void updateStatus()}>Save</Button>
                              </div>
                            </div>
                          </section>

                          <section className="border-t border-slate-200 pt-5 sm:pt-6">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h3 className="text-sm font-black text-slate-950">Interview history</h3>
                                <p className="mt-1 text-xs text-slate-500">Past and scheduled interviews for this candidate.</p>
                              </div>
                              {loadingHistory && <span className="text-xs text-slate-400">Loading…</span>}
                            </div>
                            <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100 sm:mt-4">
                              {!loadingHistory && history.interviews.length === 0 && <p className="py-6 text-xs text-slate-400">No interview history yet.</p>}
                              {history.interviews.map((item) => {
                                const total = item.evaluations.reduce((sum, evaluation) => sum + evaluation.scores.reduce((scoreTotal, score) => scoreTotal + score.points, 0), 0);
                                const max = item.evaluations.reduce((sum, evaluation) => sum + evaluation.scores.reduce((scoreTotal, score) => scoreTotal + (score.criterion?.maxPoints ?? 0), 0), 0);
                                return (
                                  <div key={item.id} className="py-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                      <div>
                                        <p className="text-sm font-bold text-slate-900">{label(item.type)} interview</p>
                                        <p className="mt-1 text-xs text-slate-500">{new Date(item.scheduledAt).toLocaleString()} · {item.durationMins} min · {item.location ?? 'Location not specified'}</p>
                                        <p className="mt-1 text-xs text-slate-400">{item.job?.title ?? 'General interview'}</p>
                                      </div>
                                      <StatusPill value={item.status} />
                                    </div>
                                    {item.evaluations.length > 0 && <p className="mt-3 text-xs font-bold text-cyan-700">Panel score: {total} / {max} ({max ? Math.round((total / max) * 100) : 0}%)</p>}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        </div>
                      )}

                      {activeDetailTab === 'documents' && (
                        <div>
                          <h3 className="text-sm font-black text-slate-950">Candidate documents</h3>
                          <p className="mt-1 text-xs text-slate-500">Manage documents attached to this candidate profile.</p>
                          <div className="mt-4 sm:mt-5">
                            <CandidateDocumentsPanel candidateId={candidate.id} apiEnabled={!developmentMode} />
                          </div>
                        </div>
                      )}

                      {activeDetailTab === 'activity' && (
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="text-sm font-black text-slate-950">Activity history</h3>
                              <p className="mt-1 text-xs text-slate-500">Status changes and other recorded candidate actions.</p>
                            </div>
                            {loadingHistory && <span className="text-xs text-slate-400">Loading…</span>}
                          </div>

                          <div className="mt-4 sm:mt-5">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Status history</h4>
                            <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                              {history.statusHistory.length ? history.statusHistory.map((item) => (
                                <div key={item.id} className="py-4">
                                  <div className="flex items-center justify-between gap-3">
                                    <StatusPill value={item.toStatus} />
                                    <span className="text-[10px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                                  </div>
                                  <p className="mt-2 text-xs text-slate-500">{item.reason ?? 'Status updated.'}</p>
                                  {item.changedBy && <p className="mt-1 text-[10px] text-slate-400">By {item.changedBy.name}</p>}
                                </div>
                              )) : <p className="py-5 text-xs text-slate-400">No status history recorded.</p>}
                            </div>
                          </div>

                          <div className="mt-6 sm:mt-7">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Activity log</h4>
                            <div className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                              {history.auditEvents.length ? history.auditEvents.map((event) => (
                                <div key={event.id} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">{event.summary}</p>
                                    <p className="mt-1 text-[10px] text-slate-400">{event.actor?.name ?? 'System'} · {label(event.action)}</p>
                                  </div>
                                  <p className="shrink-0 text-[10px] text-slate-400">{new Date(event.createdAt).toLocaleString()}</p>
                                </div>
                              )) : <p className="py-5 text-xs text-slate-400">No candidate activity recorded yet.</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </section>
  );
};

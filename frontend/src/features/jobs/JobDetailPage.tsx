import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { Icon } from '../../shared/components/Icon';
import { StatusPill } from '../../shared/components/StatusPill';
import { SelectMenu } from '../../shared/components/SelectMenu';
import { DatePicker } from '../../shared/components/DatePicker';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { CandidateMultiSelect } from '../interviews/CandidateMultiSelect';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { apiFetch } from '../../shared/lib/api';
import type { Agency, Candidate, Interview, InterviewCriterionAssignment, InterviewCriterionGroup, Job, JobCandidate, JobDetail, User, UserRole } from '../../domain/types';
import { useLanguage } from '../../i18n/LanguageContext';

interface JobDetailPageProps {
  role: UserRole;
  jobId: string | null;
  onBack: () => void;
}

const label = (value: string): string => value.replaceAll('_', ' ');
const jobCode = (id: string): string => 'JOB-' + id.slice(0, 8).toUpperCase();
const CANDIDATE_POOL_PAGE_SIZE = 6;
const INTERVIEW_PAGE_SIZE = 6;

const emptyCandidate = {
  agencyRegisterNo: '',
  firstName: '',
  lastName: '',
  birthdate: '',
  passportNumber: '',
  passportExpiry: '',
  requestedProfession: '',
};

const defaultInterview = {
  type: 'TECHNICAL' as Interview['type'],
  scheduledAt: '',
  durationMins: '45',
  location: '',
  notes: '',
};

const toDateTimeLocal = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
};

const escapeReportHtml = (value: unknown): string => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const buildJobReportHtml = (
  job: JobDetail,
  positions: Array<{ id: string; position: string; requiredCount: number }>,
  candidatePool: JobCandidate[],
  interviews: Interview[],
) => {
  const positionRows = positions.map((item) => '<tr><td>' + escapeReportHtml(item.position) + '</td><td>' + item.requiredCount + '</td></tr>').join('');
  const candidateRows = candidatePool.map((item) => '<tr><td>' + escapeReportHtml(item.candidate.name) + '</td><td>' + escapeReportHtml(item.candidate.reference) + '</td><td>' + escapeReportHtml(item.candidate.passportNumber || 'Not provided') + '</td><td>' + escapeReportHtml(item.candidate.profession || 'Profession not set') + '</td><td>' + escapeReportHtml(item.status) + '</td></tr>').join('');
  const interviewRows = interviews.map((item) => '<tr><td>' + escapeReportHtml(item.candidate?.name || item.candidateId) + '</td><td>' + escapeReportHtml(item.candidate?.passportNumber || 'Not provided') + '</td><td>' + escapeReportHtml(item.type) + '</td><td>' + escapeReportHtml(item.status) + '</td><td>' + escapeReportHtml(new Date(item.scheduledAt).toLocaleString()) + '</td></tr>').join('');
  return '<!doctype html><html><head><meta charset="utf-8"><title>BuildHire - ' + escapeReportHtml(job.title) + '</title><style>' +
    'body{font-family:Arial,sans-serif;color:#0f172a;margin:32px;font-size:12px}' +
    'h1{font-size:24px;margin:0 0 6px}h2{font-size:15px;margin:24px 0 8px}' +
    '.meta{color:#64748b;margin-bottom:18px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0}.stat{border:1px solid #e2e8f0;border-radius:8px;padding:10px}.label{font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700}.value{font-size:16px;font-weight:800;margin-top:4px}' +
    'table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border:1px solid #e2e8f0;padding:7px;text-align:left}th{background:#f8fafc;font-size:10px;text-transform:uppercase;color:#64748b}' +
    '@media print{body{margin:16px}.no-print{display:none}}' +
    '</style></head><body><h1>' + escapeReportHtml(job.title) + '</h1>' +
    '<div class="meta">' + escapeReportHtml(job.location || 'Location not set') + ' · Status: ' + escapeReportHtml(job.status) + ' · Created: ' + escapeReportHtml(job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—') + '</div>' +
    '<div class="grid"><div class="stat"><div class="label">Required workers</div><div class="value">' + job.openings + '</div></div>' +
    '<div class="stat"><div class="label">Candidates</div><div class="value">' + candidatePool.length + '</div></div>' +
    '<div class="stat"><div class="label">Interviews</div><div class="value">' + interviews.length + '</div></div>' +
    '<div class="stat"><div class="label">Filled</div><div class="value">' + candidatePool.filter((item) => item.status === 'HIRED').length + '</div></div></div>' +
    (job.description ? '<h2>Job description</h2><p>' + escapeReportHtml(job.description) + '</p>' : '') +
    '<h2>Positions</h2><table><thead><tr><th>Position</th><th>Required workers</th></tr></thead><tbody>' + positionRows + '</tbody></table>' +
    '<h2>Candidate pool</h2><table><thead><tr><th>Candidate</th><th>Reference</th><th>Passport</th><th>Profession</th><th>Status</th></tr></thead><tbody>' + candidateRows + '</tbody></table>' +
    '<h2>Interview activity</h2><table><thead><tr><th>Candidate</th><th>Passport</th><th>Type</th><th>Status</th><th>Scheduled</th></tr></thead><tbody>' + interviewRows + '</tbody></table>' +
    '</body></html>';
};

const downloadJobExcel = (
  job: JobDetail,
  positions: Array<{ id: string; position: string; requiredCount: number }>,
  candidatePool: JobCandidate[],
  interviews: Interview[],
) => {
  const html = buildJobReportHtml(job, positions, candidatePool, interviews);
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'buildhire-' + jobCode(job.id).toLowerCase() + '-report.xls';
  anchor.click();
  URL.revokeObjectURL(url);
};

const printJobPdf = (
  job: JobDetail,
  positions: Array<{ id: string; position: string; requiredCount: number }>,
  candidatePool: JobCandidate[],
  interviews: Interview[],
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(buildJobReportHtml(job, positions, candidatePool, interviews));
  printWindow.document.close();
  printWindow.document.title = 'BuildHire - ' + job.title;
  window.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 250);
};

const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { if (row.length || field) { pushField(); rows.push(row); row = []; } };
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if (!quoted && char === ',') pushField();
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      pushRow();
    } else field += char;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  if (field || row.length) pushRow();
  return rows;
};

const rowsToCandidates = (csv: string): Array<Record<string, string>> => {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error('CSV must contain a header row and at least one candidate.');
  const headers = rows[0].map((value) => value.trim().toLowerCase().replace(/\s+/g, ''));
  return rows.slice(1).filter((row) => row.some(Boolean)).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? '').trim()])),
  );
};

const toJobDetailFromState = (job: Job, memberships: JobCandidate[], interviews: Interview[]): JobDetail => {
  const candidatePool = memberships.filter((item) => item.jobId === job.id);
  const jobInterviews = interviews.filter((item) => item.jobId === job.id);
  return {
    ...job,
    candidatePool,
    interviews: jobInterviews,
    candidateCount: candidatePool.length,
    interviewCount: jobInterviews.length,
    filledCount: candidatePool.filter((item) => item.status === 'HIRED').length,
  };
};

const normalizeCriteriaGroupName = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, ' ');

const orderCriteriaGroups = (groups: InterviewCriterionGroup[]): InterviewCriterionGroup[] => {
  const priority = ['personal', 'experience', 'skills and capabilities'];
  return groups
    .map((group, index) => ({ group, index }))
    .sort((left, right) => {
      const leftPriority = priority.indexOf(normalizeCriteriaGroupName(left.group.name));
      const rightPriority = priority.indexOf(normalizeCriteriaGroupName(right.group.name));
      const normalizedLeftPriority = leftPriority === -1 ? priority.length : leftPriority;
      const normalizedRightPriority = rightPriority === -1 ? priority.length : rightPriority;
      if (normalizedLeftPriority !== normalizedRightPriority) return normalizedLeftPriority - normalizedRightPriority;
      return left.index - right.index;
    })
    .map(({ group }) => group);
};

const buildAssignments = (groups: InterviewCriterionGroup[], selectedIds: string[]): InterviewCriterionAssignment[] => {
  let sortOrder = 0;
  const result: InterviewCriterionAssignment[] = [];
  const seen = new Set<string>();
  for (const groupId of selectedIds) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) continue;
    for (const item of group.criteria) {
      if (seen.has(item.criterionId)) continue;
      seen.add(item.criterionId);
      result.push({
        id: 'assignment-' + Date.now() + '-' + sortOrder,
        interviewId: undefined,
        criterionId: item.criterionId,
        groupId: group.id,
        name: item.criterion.name,
        description: item.criterion.description,
        maxPoints: item.criterion.maxPoints,
        responseType: item.criterion.responseType,
        required: item.criterion.required,
        options: item.criterion.options,
        sortOrder: sortOrder++,
      });
    }
  }
  return result;
};



export const JobDetailPage = ({ role, jobId, onBack }: JobDetailPageProps) => {
  const { user, developmentMode } = useAuth();
  const { t } = useLanguage();
  const { state, dispatch } = useRecruitment();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const [agencies, setAgencies] = useState<Agency[]>(developmentMode ? state.agencies : []);
  const [candidateForm, setCandidateForm] = useState(emptyCandidate);
  const [candidateAgencyId, setCandidateAgencyId] = useState(user?.agencyId ?? '');
  const [candidateSaving, setCandidateSaving] = useState(false);
  const [candidateModal, setCandidateModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAgencyId, setUploadAgencyId] = useState(user?.agencyId ?? '');
  const [uploading, setUploading] = useState(false);

  const [scheduleModal, setScheduleModal] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleForm, setScheduleForm] = useState(defaultInterview);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidatePoolSearch, setCandidatePoolSearch] = useState('');
  const [candidateAgencyFilter, setCandidateAgencyFilter] = useState('');
  const [candidateStatusFilter, setCandidateStatusFilter] = useState('');
  const [candidatePoolPage, setCandidatePoolPage] = useState(1);
  const [interviewSearch, setInterviewSearch] = useState('');
  const [interviewStatusFilter, setInterviewStatusFilter] = useState('');
  const [interviewPage, setInterviewPage] = useState(1);
  const [interviewAgencyId, setInterviewAgencyId] = useState('');
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [selectedInterviewers, setSelectedInterviewers] = useState<string[]>([]);
  const [criteriaGroups, setCriteriaGroups] = useState<InterviewCriterionGroup[]>([]);
  const [selectedCriteriaGroups, setSelectedCriteriaGroups] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const candidateTrap = useFocusTrap<HTMLDivElement>({ enabled: candidateModal, onEscape: () => setCandidateModal(false) });
  const uploadTrap = useFocusTrap<HTMLDivElement>({ enabled: uploadModal, onEscape: () => setUploadModal(false) });
  const scheduleTrap = useFocusTrap<HTMLDivElement>({ enabled: scheduleModal, onEscape: () => setScheduleModal(false) });

  const stateJob = useMemo(() => (jobId ? state.jobs.find((item) => item.id === jobId) : undefined), [jobId, state.jobs]);

  useEffect(() => {
    setCandidatePoolPage(1);
    setInterviewPage(1);
  }, [jobId, candidatePoolSearch, candidateAgencyFilter, interviewSearch]);

  const refreshJob = async () => {
    if (!jobId) return;
    if (developmentMode) {
      const current = state.jobs.find((item) => item.id === jobId);
      if (current) setJob(toJobDetailFromState(current, state.jobCandidates, state.interviews));
      return;
    }
    const result = await apiFetch<JobDetail>('/jobs/' + jobId);
    setJob(result);
  };

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }
    if (developmentMode) {
      if (!stateJob) {
        setJob(null);
      } else {
        setJob(toJobDetailFromState(stateJob, state.jobCandidates, state.interviews));
      }
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    apiFetch<JobDetail>('/jobs/' + jobId)
      .then((result) => { if (!cancelled) setJob(result); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load the job.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [developmentMode, jobId, state.interviews, state.jobCandidates, stateJob]);

  useEffect(() => {
    if (developmentMode) {
      setAgencies(state.agencies);
      return;
    }
    if (role === 'ADMIN') {
      apiFetch<Agency[]>('/agencies').then(setAgencies).catch(() => undefined);
    }
  }, [developmentMode, role, state.agencies]);

  const canManage = role === 'ADMIN' || role === 'AGENCY';

  const openCandidateModal = () => {
    setCandidateForm(emptyCandidate);
    setCandidateAgencyId(user?.agencyId ?? agencies.find((item) => item.status === 'ACTIVE')?.id ?? '');
    setCandidateModal(true);
    setError('');
  };

  const createCandidate = async () => {
    if (!job || !candidateForm.agencyRegisterNo.trim() || !candidateForm.firstName.trim() || !candidateForm.lastName.trim() || !candidateForm.birthdate.trim() || !candidateForm.passportNumber.trim() || !candidateForm.passportExpiry.trim() || !candidateForm.requestedProfession.trim() || !candidateAgencyId) {
      setError('Agency register number, first name, last name, birth date, passport details, requested profession, and agency are required.');
      return;
    }
    setCandidateSaving(true);
    setError('');
    try {
      if (developmentMode) {
        const id = 'candidate-' + Date.now();
        const name = [candidateForm.firstName.trim(), candidateForm.lastName.trim()].join(' ');
        const candidate: Candidate = {
          id,
          agencyId: candidateAgencyId,
          reference: 'CA-' + Date.now().toString().slice(-6),
          agencyRegisterNo: candidateForm.agencyRegisterNo.trim(),
          firstName: candidateForm.firstName.trim(),
          lastName: candidateForm.lastName.trim(),
          name,
          birthdate: candidateForm.birthdate || null,
          passportNumber: candidateForm.passportNumber.trim() || null,
          passportExpiry: candidateForm.passportExpiry || null,
          requestedProfession: candidateForm.requestedProfession.trim(),
          skills: [],
          onboardingStatus: 'NOT_STARTED',
          source: 'AGENCY_ADDED',
          status: 'POOL',
          statusUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const membership: JobCandidate = {
          id: 'job-candidate-' + Date.now(),
          jobId: job.id,
          candidateId: id,
          status: 'POOL',
          statusUpdatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          candidate,
        };
        dispatch({ type: 'CREATE_CANDIDATE', candidate });
        dispatch({ type: 'ADD_JOB_CANDIDATES', memberships: [membership] });
      } else {
        await apiFetch<Candidate>('/agencies/' + candidateAgencyId + '/candidates', {
          method: 'POST',
          body: JSON.stringify({
            agencyRegisterNo: candidateForm.agencyRegisterNo.trim(),
            firstName: candidateForm.firstName.trim(),
            lastName: candidateForm.lastName.trim(),
            birthdate: candidateForm.birthdate,
            passportNumber: candidateForm.passportNumber.trim(),
            passportExpiry: candidateForm.passportExpiry,
            requestedProfession: candidateForm.requestedProfession.trim(),
            jobId: job.id,
          }),
        });
      }
      setCandidateModal(false);
      setCandidateForm(emptyCandidate);
      setSuccess('Candidate added to this job.');
      await refreshJob();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to add candidate.');
    } finally {
      setCandidateSaving(false);
    }
  };

  const uploadCandidates = async () => {
    if (!job || !uploadFile || !uploadAgencyId) return;
    setUploading(true);
    setError('');
    try {
      const csv = await uploadFile.text();
      if (developmentMode) {
        const rows = rowsToCandidates(csv);
        const required = ['agencyregisterno', 'firstname', 'lastname', 'birthdate', 'passportnumber', 'passportexpiry', 'requestedprofession'];
        const missing = required.find((item) => !(item in (rows[0] ?? {})));
        if (missing) throw new Error('CSV is missing the required column: ' + missing);
        const memberships: JobCandidate[] = [];
        for (const row of rows) {
          const id = 'candidate-' + Date.now() + '-' + memberships.length;
          const firstName = row.firstname || '';
          const lastName = row.lastname || '';
          const candidate: Candidate = {
            id,
            agencyId: uploadAgencyId,
            reference: 'CA-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
            agencyRegisterNo: row.agencyregisterno || '',
            firstName,
            lastName,
            name: [firstName, lastName].filter(Boolean).join(' '),
            birthdate: row.birthdate || null,
            passportNumber: row.passportnumber || null,
            passportExpiry: row.passportexpiry || null,
            requestedProfession: row.requestedprofession || '',
            skills: [],
            onboardingStatus: 'NOT_STARTED',
            source: 'BULK_IMPORTED',
            status: 'POOL',
            statusUpdatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          memberships.push({
            id: 'job-candidate-' + id,
            jobId: job.id,
            candidateId: id,
            status: 'POOL',
            statusUpdatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            candidate,
          });
        }
        memberships.forEach((membership) => dispatch({ type: 'CREATE_CANDIDATE', candidate: membership.candidate }));
        dispatch({ type: 'ADD_JOB_CANDIDATES', memberships });
        setSuccess('Imported ' + memberships.length + ' candidate(s) into this job.');
      } else {
        await apiFetch<{ importedCount: number }>('/agencies/' + uploadAgencyId + '/candidates/bulk?jobId=' + encodeURIComponent(job.id), {
          method: 'POST',
          headers: { 'content-type': 'text/csv' },
          body: csv,
        });
      }
      setUploadModal(false);
      setUploadFile(null);
      setSuccess('Candidates uploaded to this job.');
      await refreshJob();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to upload candidates.');
    } finally {
      setUploading(false);
    }
  };

  const openScheduleModal = async () => {
    if (!job) return;
    setError('');
    setSuccess('');
    setSelectedCandidateIds([]);
    setSelectedInterviewers([]);
    setSelectedCriteriaGroups([]);
    setCandidateSearch('');
    setInterviewAgencyId(job.candidatePool.find((item) => item.candidate.agencyId)?.candidate.agencyId ?? '');
    setScheduleForm({ ...defaultInterview, scheduledAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)), location: job.location ?? '' });
    try {
      if (developmentMode) {
        const groups = orderCriteriaGroups(state.interviewCriterionGroups.filter((item) => item.active));
        setCriteriaGroups(groups);
        setSelectedCriteriaGroups(groups.map((item) => item.id));
        const agencyIds = [...new Set(job.candidatePool.map((item) => item.candidate.agencyId))];
        setInterviewers(state.users.filter((item) => item.role === 'INTERVIEWER' && item.active && (item.agencyId === null || agencyIds.includes(item.agencyId))));
      } else {
        const agencyIds = [...new Set(job.candidatePool.map((item) => item.candidate.agencyId))];
        const [groups, ...interviewerResults] = await Promise.all([
          apiFetch<InterviewCriterionGroup[]>('/interview-criteria-groups'),
          ...agencyIds.map((agencyId) => apiFetch<User[]>('/interviewers?agencyId=' + encodeURIComponent(agencyId))),
        ]);
        const activeGroups = orderCriteriaGroups(groups.filter((item) => item.active));
        const uniqueInterviewers = [...new Map(interviewerResults.flat().map((item) => [item.id, item])).values()];
        setCriteriaGroups(activeGroups);
        setSelectedCriteriaGroups(activeGroups.map((item) => item.id));
        setInterviewers(uniqueInterviewers.filter((item) => item.active));
      }
      setScheduleModal(true);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load interview setup.');
    }
  };

  const scheduleInterviews = async () => {
    if (!job) return;
    const candidateIds = selectedCandidateIds;
    const durationMins = Number(scheduleForm.durationMins) || 45;
    if (!candidateIds.length) { setError('Select at least one candidate.'); return; }
    if (!scheduleForm.scheduledAt) { setError('Select an interview date and time.'); return; }
    if (!selectedInterviewers.length) { setError('Select at least one interviewer.'); return; }
    if (!selectedCriteriaGroups.length) { setError('Select at least one interview criteria group.'); return; }

    setScheduleSaving(true);
    setError('');
    try {
      if (developmentMode) {
        const assignments = buildAssignments(criteriaGroups, selectedCriteriaGroups);
        candidateIds.forEach((candidateId, index) => {
          const candidate = job.candidatePool.find((item) => item.candidateId === candidateId)?.candidate;
          if (!candidate) return;
          const interview: Interview = {
            id: 'interview-' + Date.now() + '-' + index,
            candidateId,
            jobId: job.id,
            type: scheduleForm.type,
            status: 'SCHEDULED',
            scheduledAt: new Date(new Date(scheduleForm.scheduledAt).getTime() + index * durationMins * 60_000).toISOString(),
            durationMins,
            location: scheduleForm.location.trim() || null,
            notes: scheduleForm.notes.trim() || null,
            panelUserIds: selectedInterviewers,
            criterionGroupId: selectedCriteriaGroups[0] ?? null,
            criterionGroupIds: selectedCriteriaGroups,
            criterionGroups: selectedCriteriaGroups
              .map((groupId) => criteriaGroups.find((group) => group.id === groupId))
              .filter((group): group is InterviewCriterionGroup => Boolean(group))
              .map((group, index) => ({ ...group, sortOrder: index })),
            criterionAssignments: assignments,
            candidate,
          };
          dispatch({ type: 'SCHEDULE_INTERVIEW', interview });
        });
      } else {
        await apiFetch('/interviews/bulk', {
          method: 'POST',
          body: JSON.stringify({
            candidateIds,
            jobId: job.id,
            type: scheduleForm.type,
            scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
            durationMins,
            location: scheduleForm.location.trim() || null,
            notes: scheduleForm.notes.trim() || null,
            interviewerIds: selectedInterviewers,
            criterionGroupIds: selectedCriteriaGroups,
          }),
        });
      }
      setScheduleModal(false);
      setSuccess(candidateIds.length + ' ' + t('interview(s) scheduled') + '.');
      await refreshJob();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to schedule interviews.');
    } finally {
      setScheduleSaving(false);
    }
  };

  const deleteJob = async () => {
    if (!job) return;
    setActionBusy(true);
    setError('');
    try {
      if (developmentMode) {
        dispatch({ type: 'DELETE_JOB', jobId: job.id });
      } else {
        await apiFetch('/jobs/' + job.id + '/permanent', { method: 'DELETE' });
      }
      setDeleteConfirm(false);
      setSuccess('Job deleted.');
      onBack();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete the job.');
    } finally {
      setActionBusy(false);
    }
  };

  useEffect(() => {
    setCandidatePoolPage(1);
  }, [candidateAgencyFilter, candidatePoolSearch, candidateStatusFilter]);

  useEffect(() => {
    setInterviewPage(1);
  }, [interviewSearch, interviewStatusFilter]);

  if (!jobId) return <StateMessage kind="empty" title={t('No job selected')} description={t('Choose a job from the Jobs page.')} />;
  if (loading) return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="loading" title="Loading job" description="Fetching the job, candidate pool and interview activity." /></section>;
  if (!job) return <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><StateMessage kind="error" title="Job not found" description={error || 'The requested job is unavailable.'} /></section>;

  const filledCount = job.filledCount ?? job.candidatePool.filter((item) => item.status === 'HIRED').length;
  const candidateCount = job.candidateCount ?? job.candidatePool.length;
  const interviewCount = job.interviewCount ?? job.interviews.length;
  const progress = job.openings ? Math.min(100, Math.round((filledCount / job.openings) * 100)) : 0;
  const positions = job.positions?.length ? job.positions.slice().sort((a, b) => a.sortOrder - b.sortOrder) : [{ id: job.id + '-position', jobId: job.id, position: job.title, requiredCount: job.openings, sortOrder: 0 }];
  const filteredCandidates = job.candidatePool.filter((membership) => {
    const query = candidatePoolSearch.trim().toLowerCase();
    const candidate = membership.candidate;
    if (candidateAgencyFilter && candidate.agencyId !== candidateAgencyFilter) return false;
    if (candidateStatusFilter && membership.status !== candidateStatusFilter) return false;
    if (!query) return true;
    return [
      candidate.name,
      candidate.reference,
      candidate.passportNumber ?? '',
      candidate.profession ?? '',
      candidate.country ?? '',
      candidate.email ?? '',
      candidate.phone ?? '',
      candidate.currentLocation ?? '',
      candidate.visaStatus ?? '',
      ...(candidate.skills ?? []),
    ].some((value) => value.toLowerCase().includes(query));
  });
  const candidatePageCount = Math.max(1, Math.ceil(filteredCandidates.length / CANDIDATE_POOL_PAGE_SIZE));
  const safeCandidatePage = Math.min(candidatePoolPage, candidatePageCount);
  const pagedCandidates = filteredCandidates.slice(
    (safeCandidatePage - 1) * CANDIDATE_POOL_PAGE_SIZE,
    safeCandidatePage * CANDIDATE_POOL_PAGE_SIZE,
  );

  const filteredInterviews = job.interviews.filter((interview) => {
    const query = interviewSearch.trim().toLowerCase();
    if (interviewStatusFilter && interview.status !== interviewStatusFilter) return false;
    if (!query) return true;
    const candidate = interview.candidate;
    return [
      candidate?.name ?? '',
      candidate?.reference ?? '',
      candidate?.passportNumber ?? '',
      candidate?.profession ?? '',
      candidate?.country ?? '',
      interview.type,
      interview.status,
      interview.location ?? '',
      interview.notes ?? '',
      new Date(interview.scheduledAt).toLocaleString(),
      ...(interview.panel ?? []).flatMap((panel) => [panel.user.name, panel.user.email]),
    ].some((value) => value.toLowerCase().includes(query));
  });
  const interviewPageCount = Math.max(1, Math.ceil(filteredInterviews.length / INTERVIEW_PAGE_SIZE));
  const safeInterviewPage = Math.min(interviewPage, interviewPageCount);
  const pagedInterviews = filteredInterviews.slice(
    (safeInterviewPage - 1) * INTERVIEW_PAGE_SIZE,
    safeInterviewPage * INTERVIEW_PAGE_SIZE,
  );

  const interviewAgencyOptions = [...new Set(job.candidatePool.map((membership) => membership.candidate.agencyId))]
    .map((agencyId) => agencies.find((item) => item.id === agencyId) ?? { id: agencyId, name: agencyId, slug: agencyId, status: 'ACTIVE' as const, userCount: 0, jobCount: 0, candidateCount: 0 })
    .map((agency) => ({ id: agency.id, name: agency.name }));

  const interviewScheduleCandidates = job.candidatePool.map((membership) => membership.candidate);

  return (
    <section className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" size="sm" onClick={onBack}><Icon name="chevron-left" size={15} /> Jobs</Button>
        {canManage && (
          <div className="flex items-center gap-1.5">
            <Button variant="secondary" size="sm" className="!size-10 !min-h-10 !p-0" title="Add candidate" aria-label="Add candidate" disabled={job.status === 'CLOSED'} onClick={openCandidateModal}><Icon name="plus" size={16} /></Button>
            <Button variant="secondary" size="sm" className="!size-10 !min-h-10 !p-0" title="Upload candidates" aria-label="Upload candidates" disabled={job.status === 'CLOSED'} onClick={() => { setUploadAgencyId(user?.agencyId ?? agencies.find((item) => item.status === 'ACTIVE')?.id ?? ''); setUploadModal(true); }}><Icon name="upload" size={16} /></Button>
            <Button variant="secondary" size="sm" className="!size-10 !min-h-10 !p-0" title="Download PDF report" aria-label="Download PDF report" onClick={() => printJobPdf(job, positions, job.candidatePool, job.interviews)}><Icon name="file" size={16} /></Button>
            <Button variant="secondary" size="sm" className="!size-10 !min-h-10 !p-0" title="Download Excel report" aria-label="Download Excel report" onClick={() => downloadJobExcel(job, positions, job.candidatePool, job.interviews)}><Icon name="download" size={16} /></Button>
            <Button variant="secondary" size="sm" className="!size-10 !min-h-10 !p-0" title="Schedule interview" aria-label="Schedule interview" disabled={job.status === 'CLOSED' || candidateCount === 0} onClick={() => void openScheduleModal()}><Icon name="calendar" size={16} /></Button>
            <Button variant="danger" size="sm" className="!size-10 !min-h-10 !p-0" title="Delete job" aria-label="Delete job" onClick={() => setDeleteConfirm(true)}><Icon name="trash" size={16} /></Button>
          </div>
        )}
      </div>

      {error && <StateMessage kind="error" title="Job action failed" description={error} floating={candidateModal || uploadModal || scheduleModal} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      <Card>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{job.title}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[10px] font-black text-slate-600"><Icon name="briefcase" size={12} /> {jobCode(job.id)}</span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500"><Icon name="map-pin" size={12} /> {job.location || 'Location not set'}</span>
            </div>
            {job.description && <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">{job.description}</p>}
          </div>
          <div className="w-full shrink-0 lg:w-72">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Worker progress</p>
              <p className="text-sm font-black text-slate-950">{filledCount} / {job.openings}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: progress + '%' }} /></div>
            <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{job.openings - filledCount > 0 ? job.openings - filledCount + ' ' + t('opening(s) remaining') : t('All openings filled')}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Positions</p><p className="mt-1 text-sm font-black text-slate-800">{positions.length}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Required workers</p><p className="mt-1 text-sm font-black text-slate-800">{job.openings}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Candidates</p><p className="mt-1 text-sm font-black text-slate-800">{candidateCount}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Interviews</p><p className="mt-1 text-sm font-black text-slate-800">{interviewCount}</p></div>
          <div className="rounded-2xl bg-slate-50 p-3.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Created</p><p className="mt-1 text-sm font-black text-slate-800">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}</p></div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <tr><th className="px-4 py-3">Position</th><th className="px-4 py-3">Required workers</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {positions.map((item) => <tr key={item.id}><td className="px-4 py-3 font-bold text-slate-800">{item.position}</td><td className="px-4 py-3 font-black text-slate-900">{item.requiredCount}</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">Candidate pool</h2>
                <p className="mt-1 text-xs text-slate-400">Candidates collected specifically for this job.</p>
              </div>
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{candidateCount}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="relative">
                <input
                  className="field-input pl-9"
                  value={candidatePoolSearch}
                  onChange={(event) => setCandidatePoolSearch(event.target.value)}
                  placeholder="Search candidates by name, passport, contact, profession…"
                  aria-label="Search candidate pool"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={14} /></span>
              </div>
              {role === 'ADMIN' && (
                <SelectMenu
                  value={candidateAgencyFilter}
                  onChange={setCandidateAgencyFilter}
                  options={[
                    { value: '', label: 'All agencies' },
                    ...agencies.map((item) => ({ value: item.id, label: item.name })),
                  ]}
                  ariaLabel="Filter candidate pool by agency"
                />
              )}
              <SelectMenu
                value={candidateStatusFilter}
                onChange={setCandidateStatusFilter}
                options={[
                  { value: '', label: 'All candidate statuses' },
                  { value: 'POOL', label: 'Pool' },
                  { value: 'READY_FOR_INTERVIEW', label: 'Ready for interview' },
                  { value: 'INTERVIEW_SCHEDULED', label: 'Interview scheduled' },
                  { value: 'INTERVIEW_COMPLETED', label: 'Interview completed' },
                  { value: 'PASSED', label: 'Passed' },
                  { value: 'REJECTED', label: 'Rejected' },
                  { value: 'ON_HOLD', label: 'On hold' },
                  { value: 'HIRED', label: 'Hired' },
                ]}
                ariaLabel="Filter candidate pool by status"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {filteredCandidates.length ? pagedCandidates.map((membership) => (
              <div key={membership.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{membership.candidate.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{membership.candidate.reference} · Passport: {membership.candidate.passportNumber || 'Not provided'} · {membership.candidate.profession || 'Profession not set'}</p>
                </div>
                <StatusPill value={membership.status} />
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-bold text-slate-700">{job.candidatePool.length ? 'No candidates match the current search or agency filter.' : 'No candidates in this job pool yet.'}</p></div>}
          </div>
          {filteredCandidates.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>{t('Showing')} {(safeCandidatePage - 1) * CANDIDATE_POOL_PAGE_SIZE + 1}-{Math.min(safeCandidatePage * CANDIDATE_POOL_PAGE_SIZE, filteredCandidates.length)} {t('of')} {filteredCandidates.length}</span>
              {candidatePageCount > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" className="!min-h-8 !px-2.5 !py-1 text-[10px]" disabled={safeCandidatePage === 1} onClick={() => setCandidatePoolPage((value) => Math.max(1, value - 1))}>Previous</Button>
                  <span className="min-w-16 text-center font-black text-slate-600">Page {safeCandidatePage} / {candidatePageCount}</span>
                  <Button size="sm" variant="secondary" className="!min-h-8 !px-2.5 !py-1 text-[10px]" disabled={safeCandidatePage === candidatePageCount} onClick={() => setCandidatePoolPage((value) => Math.min(candidatePageCount, value + 1))}>Next</Button>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="min-w-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-950">Interview activity</h2>
                <p className="mt-1 text-xs text-slate-400">Every interview attached to this job.</p>
              </div>
              <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">{interviewCount}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="relative">
                <input
                  className="field-input pl-9"
                  value={interviewSearch}
                  onChange={(event) => setInterviewSearch(event.target.value)}
                  placeholder="Search candidate, passport, interviewer, status, type, location…"
                  aria-label="Search job interviews"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Icon name="search" size={14} /></span>
              </div>
              <SelectMenu
                value={interviewStatusFilter}
                onChange={setInterviewStatusFilter}
                options={[
                  { value: '', label: 'All interview statuses' },
                  { value: 'SCHEDULED', label: 'Scheduled' },
                  { value: 'IN_PROGRESS', label: 'In progress' },
                  { value: 'COMPLETED', label: 'Completed' },
                  { value: 'CANCELLED', label: 'Cancelled' },
                  { value: 'NO_SHOW', label: 'No show' },
                ]}
                ariaLabel="Filter job interviews by status"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {filteredInterviews.length ? pagedInterviews.map((interview) => (
              <div key={interview.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{interview.candidate?.name ?? interview.candidateId}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{label(interview.type)} · {new Date(interview.scheduledAt).toLocaleString()} · {interview.candidate?.passportNumber ? 'Passport: ' + interview.candidate.passportNumber : 'Passport not provided'}</p>
                  </div>
                  <StatusPill value={interview.status} />
                </div>
                <div className="mt-2 text-[10px] font-semibold text-slate-400">{interview.durationMins} min · {interview.panel?.length ?? interview.panelUserIds.length} interviewer(s)</div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center"><p className="text-sm font-bold text-slate-700">{job.interviews.length ? 'No interviews match the current search.' : 'No interviews scheduled yet.'}</p></div>}
          </div>
          {filteredInterviews.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <span>Showing {(safeInterviewPage - 1) * INTERVIEW_PAGE_SIZE + 1}-{Math.min(safeInterviewPage * INTERVIEW_PAGE_SIZE, filteredInterviews.length)} of {filteredInterviews.length}</span>
              {interviewPageCount > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="secondary" className="!min-h-8 !px-2.5 !py-1 text-[10px]" disabled={safeInterviewPage === 1} onClick={() => setInterviewPage((value) => Math.max(1, value - 1))}>Previous</Button>
                  <span className="min-w-16 text-center font-black text-slate-600">Page {safeInterviewPage} / {interviewPageCount}</span>
                  <Button size="sm" variant="secondary" className="!min-h-8 !px-2.5 !py-1 text-[10px]" disabled={safeInterviewPage === interviewPageCount} onClick={() => setInterviewPage((value) => Math.min(interviewPageCount, value + 1))}>Next</Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {candidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button type="button" aria-label="Close add candidate dialog" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setCandidateModal(false)} />
          <div ref={candidateTrap} role="dialog" aria-modal="true" className="relative z-10 my-auto w-full max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Job candidate</p><h2 className="mt-1 text-lg font-black text-slate-950">Add candidate</h2><p className="mt-1 text-xs text-slate-500">Create a candidate and place them directly into this job pool.</p></div><button type="button" className="grid size-9 place-items-center rounded-xl text-xl text-slate-400 hover:bg-slate-100" onClick={() => setCandidateModal(false)} aria-label="Close">×</button></div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormField label="Job / position"><SelectMenu value={job.id} options={[{ value: job.id, label: job.title }]} onChange={() => undefined} ariaLabel="Current job" disabled /></FormField>
              </div>
              {role === 'ADMIN' && <FormField label="Agency workspace"><SelectMenu value={candidateAgencyId} onChange={setCandidateAgencyId} options={[{ value: '', label: 'Select an agency' }, ...agencies.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Candidate agency" /></FormField>}
              <FormField label="Agency Register No"><input className="field-input" value={candidateForm.agencyRegisterNo} onChange={(e) => setCandidateForm({ ...candidateForm, agencyRegisterNo: e.target.value })} /></FormField>
              <FormField label="First name"><input className="field-input" value={candidateForm.firstName} onChange={(e) => setCandidateForm({ ...candidateForm, firstName: e.target.value })} /></FormField>
              <FormField label="Last name"><input className="field-input" value={candidateForm.lastName} onChange={(e) => setCandidateForm({ ...candidateForm, lastName: e.target.value })} /></FormField>
              <FormField label="Birth date"><input type="date" className="field-input" value={candidateForm.birthdate} onChange={(e) => setCandidateForm({ ...candidateForm, birthdate: e.target.value })} /></FormField>
              <FormField label="Passport number"><input className="field-input" value={candidateForm.passportNumber} onChange={(e) => setCandidateForm({ ...candidateForm, passportNumber: e.target.value })} /></FormField>
              <FormField label="Passport expiry"><input type="date" className="field-input" value={candidateForm.passportExpiry} onChange={(e) => setCandidateForm({ ...candidateForm, passportExpiry: e.target.value })} /></FormField>
              <div className="md:col-span-2"><FormField label="Requested profession"><input className="field-input" value={candidateForm.requestedProfession} onChange={(e) => setCandidateForm({ ...candidateForm, requestedProfession: e.target.value })} /></FormField></div>
            </div>
<div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setCandidateModal(false)}>Cancel</Button><Button disabled={candidateSaving || !candidateForm.agencyRegisterNo.trim() || !candidateForm.firstName.trim() || !candidateForm.lastName.trim() || !candidateForm.birthdate.trim() || !candidateForm.passportNumber.trim() || !candidateForm.passportExpiry.trim() || !candidateForm.requestedProfession.trim() || !candidateAgencyId} onClick={() => void createCandidate()}>{candidateSaving ? 'Saving…' : 'Add candidate'}</Button></div>
          </div>
        </div>
      )}

      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button type="button" aria-label="Close upload dialog" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setUploadModal(false)} />
          <div ref={uploadTrap} role="dialog" aria-modal="true" className="relative z-10 my-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Job candidate import</p><h2 className="mt-1 text-lg font-black text-slate-950">Upload candidates</h2><p className="mt-1 text-xs leading-5 text-slate-500">Import candidates directly into this job pool using the platform CSV format.</p>
            <div className="mt-5 space-y-4">
              <FormField label="Job / position" hint="This popup was opened from the current job, so the job is already selected.">
                <SelectMenu value={job.id} options={[{ value: job.id, label: job.title }]} onChange={() => undefined} ariaLabel="Current job" disabled />
              </FormField>
              {role === 'ADMIN' && <FormField label="Agency workspace"><SelectMenu value={uploadAgencyId} onChange={setUploadAgencyId} options={[{ value: '', label: 'Select an agency' }, ...agencies.filter((item) => item.status === 'ACTIVE').map((item) => ({ value: item.id, label: item.name }))]} ariaLabel="Import agency" /></FormField>}
              <FormField label="CSV file"><input type="file" accept=".csv,text/csv" className="field-input" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} /></FormField>
              {uploadFile && <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">{uploadFile.name}</div>}
            </div>
            <div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setUploadModal(false)}>Cancel</Button><Button disabled={uploading || !uploadFile || !uploadAgencyId} onClick={() => void uploadCandidates()}>{uploading ? 'Uploading…' : 'Upload candidates'}</Button></div>
          </div>
        </div>
      )}

      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6" role="presentation">
          <button type="button" aria-label="Close schedule dialog" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={() => setScheduleModal(false)} />
          <div ref={scheduleTrap} role="dialog" aria-modal="true" className="relative z-10 flex w-full max-w-4xl max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <header className="shrink-0 border-b border-slate-200 px-5 py-4"><p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-600">Interview scheduling</p><h2 className="mt-1 text-lg font-black text-slate-950">Schedule interview</h2><p className="mt-1 text-xs text-slate-500">Select candidates, interview settings, criteria and the interviewer panel.</p></header>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Job / position" hint="This popup was opened from the current job, so the job is already selected.">
                  <SelectMenu value={job.id} options={[{ value: job.id, label: job.title }]} onChange={() => undefined} ariaLabel="Current job" disabled />
                </FormField>
                <FormField label="Interview type"><SelectMenu value={scheduleForm.type} onChange={(value) => setScheduleForm({ ...scheduleForm, type: value as Interview['type'] })} options={[{ value: 'SCREENING', label: 'Screening' }, { value: 'TECHNICAL', label: 'Technical' }, { value: 'PRACTICAL', label: 'Practical' }, { value: 'FINAL', label: 'Final' }]} ariaLabel="Interview type" /></FormField>
                <FormField label="Date & time"><DatePicker value={scheduleForm.scheduledAt} onChange={(value) => setScheduleForm({ ...scheduleForm, scheduledAt: value })} showTime placeholder="Select date and time" ariaLabel="Interview date and time" /></FormField>
                <FormField label="Duration (minutes)"><input type="number" min="15" max="480" className="field-input" value={scheduleForm.durationMins} onChange={(e) => setScheduleForm({ ...scheduleForm, durationMins: e.target.value })} /></FormField>
                <FormField label="Location"><input className="field-input" value={scheduleForm.location} onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })} /></FormField>
                <FormField label="Notes"><input className="field-input" value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} /></FormField>
              </div>

              <div className="mt-5">
                <FormField label="Candidates" hint="Browse an agency, search candidates, then move them into the selected panel. The selected job is used as the candidate pool.">
                  <CandidateMultiSelect
                    candidates={interviewScheduleCandidates}
                    agencyOptions={interviewAgencyOptions}
                    activeAgencyId={interviewAgencyId}
                    selectedIds={selectedCandidateIds}
                    search={candidateSearch}
                    onAgencyChange={(value) => {
                      setInterviewAgencyId(value);
                      setCandidateSearch('');
                    }}
                    onSearchChange={setCandidateSearch}
                    onToggle={(candidateId) => setSelectedCandidateIds((current) => current.includes(candidateId)
                      ? current.filter((id) => id !== candidateId)
                      : [...current, candidateId])}
                    onRemove={(candidateId) => setSelectedCandidateIds((current) => current.filter((id) => id !== candidateId))}
                    onClear={() => setSelectedCandidateIds([])}
                  />
                </FormField>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div><p className="field-label">Interviewers</p><div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-slate-200">{interviewers.length ? interviewers.map((item) => { const checked = selectedInterviewers.includes(item.id); return <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"><input type="checkbox" checked={checked} onChange={() => setSelectedInterviewers((current) => checked ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span className="min-w-0"><span className="block text-xs font-black text-slate-800">{item.name}</span><span className="block text-[10px] text-slate-400">{item.email}</span></span></label>; }) : <p className="p-4 text-xs text-slate-400">No active interviewers are available for this job's candidate agencies.</p>}</div></div>
                <div>
                  <FormField label="Interview criteria groups" hint="All active groups are selected by default. Group order becomes the section order in the interview panel.">
                    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5">
                      {selectedCriteriaGroups.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">Interview group order</p>
                          {selectedCriteriaGroups.map((groupId, index) => {
                            const group = criteriaGroups.find((item) => item.id === groupId);
                            if (!group) return null;
                            const scoreMax = group.criteria.reduce((sum, item) => sum + item.criterion.maxPoints, 0);
                            return (
                              <div key={group.id} className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2.5">
                                <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-cyan-600 text-[10px] font-black text-white">{index + 1}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-extrabold text-slate-800">{group.name}</p>
                                  <p className="mt-0.5 truncate text-[10px] text-slate-400">{group.category ?? 'General'} · {group.criteria.length} criteria · {scoreMax} pts</p>
                                </div>
                                <button type="button" title="Move group up" aria-label={`Move ${group.name} up`} disabled={index === 0} onClick={() => setSelectedCriteriaGroups((current) => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-500 disabled:opacity-30">↑</button>
                                <button type="button" title="Move group down" aria-label={`Move ${group.name} down`} disabled={index === selectedCriteriaGroups.length - 1} onClick={() => setSelectedCriteriaGroups((current) => { const next = [...current]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; return next; })} className="grid size-7 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-xs font-black text-slate-500 disabled:opacity-30">↓</button>
                                <button type="button" title="Remove group" aria-label={`Remove ${group.name}`} onClick={() => setSelectedCriteriaGroups((current) => current.filter((id) => id !== group.id))} className="grid size-7 shrink-0 place-items-center rounded-lg border border-rose-100 bg-white text-xs font-black text-rose-500">×</button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div>
                        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Available groups</p>
                        {criteriaGroups.length ? (
                          <div className="grid gap-2">
                            {orderCriteriaGroups(criteriaGroups).filter((group) => !selectedCriteriaGroups.includes(group.id)).map((group) => (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => setSelectedCriteriaGroups((current) => [...current, group.id])}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:bg-slate-50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-extrabold text-slate-800">{group.name}</span>
                                  <span className="mt-0.5 block truncate text-[10px] text-slate-400">{group.category ?? 'General'} · {group.criteria.length} criteria</span>
                                </span>
                                <span className="grid size-6 shrink-0 place-items-center rounded-lg border border-slate-200 text-xs font-black text-cyan-600">+</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="p-2 text-xs text-slate-400">No active criteria groups available.</p>
                        )}
                      </div>
                    </div>
                    <p className="mt-1.5 text-[10px] font-bold text-slate-400">{selectedCriteriaGroups.length} group(s) selected</p>
                  </FormField>
                </div>
              </div>
            </div>
            <footer className="shrink-0 border-t border-slate-200 bg-slate-50/70 px-5 py-3"><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setScheduleModal(false)}>Cancel</Button><Button disabled={scheduleSaving} onClick={() => void scheduleInterviews()}>{scheduleSaving ? 'Scheduling…' : 'Schedule interview'}</Button></div></footer>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm}
        title="Delete this job?"
        description="The job will be permanently removed. Jobs with interview records or hired candidates cannot be deleted."
        confirmLabel="Delete job"
        cancelLabel="Keep job"
        danger
        busy={actionBusy}
        onCancel={() => { if (!actionBusy) setDeleteConfirm(false); }}
        onConfirm={() => void deleteJob()}
      />
    </section>
  );
};

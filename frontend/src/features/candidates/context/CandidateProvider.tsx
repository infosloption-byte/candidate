import { createContext, useEffect, useMemo, useReducer, type PropsWithChildren } from 'react';
import { CandidateContext } from './CandidateContextObject';
import type { Candidate, CandidateAction, CandidateState } from './CandidateContext';
import type { CandidateStatus } from '../types/candidate';

const seed: Candidate[] = [
  {
    id: 'cand-001', reference: 'CA-1001', name: 'Kasun Perera', phone: '+94 77 123 4567', passportNumber: 'N7XXXX21', age: 31, location: 'Colombo', profession: 'Mason', originalProfession: 'Mason', experienceYears: 9,
    secondarySkills: ['Tile', 'Putty', 'Plaster'], overseasCountries: ['Qatar', 'UAE'], englishLevel: 'Good', locationReady: true, drivingLicense: true, availability: 'Available now', source: 'Referral', status: 'interview', fitScore: 92,
    documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'verified' }, lastInterview: { date: '16 Sep 2026', interviewer: 'Nadeesha Fernando', role: 'Mason', result: 'Passed', score: 88, note: 'Strong finish work and site awareness.' },
    journey: [
      { id: 'e1', date: '16 Sep 2026', title: 'Interview passed', detail: 'Technical interview scored 88%.', tone: 'positive' },
      { id: 'e2', date: '15 Sep 2026', title: 'Shortlisted', detail: 'Matched Mason requirement for Dubai project.', tone: 'positive' },
      { id: 'e3', date: '12 Sep 2026', title: 'Candidate added', detail: 'Added from referral.', tone: 'neutral' },
    ], createdAt: '2026-09-12',
  },
  {
    id: 'cand-002', reference: 'CA-1002', name: 'Ruwan Silva', phone: '+94 71 442 1902', passportNumber: 'N6XXXX78', age: 36, location: 'Gampaha', profession: 'Welder', originalProfession: 'Welder', experienceYears: 7,
    secondarySkills: ['Fabrication', 'Arc Welding'], overseasCountries: ['Saudi Arabia'], englishLevel: 'Working', locationReady: true, drivingLicense: false, availability: 'Within 2 weeks', source: 'Agency', status: 'screening', fitScore: 84,
    documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'needs-review' }, journey: [
      { id: 'e1', date: '17 Sep 2026', title: 'Screening started', detail: 'Recruiter is checking trade fit and availability.', tone: 'warning' },
      { id: 'e2', date: '17 Sep 2026', title: 'Candidate added', detail: 'Imported from agency shortlist.', tone: 'neutral' },
    ], createdAt: '2026-09-17',
  },
  {
    id: 'cand-003', reference: 'CA-1003', name: 'Chaminda Jayasuriya', phone: '+94 76 201 9981', passportNumber: 'N5XXXX33', age: 29, location: 'Kurunegala', profession: 'Shuttering Carpenter', originalProfession: 'Carpenter', experienceYears: 6,
    secondarySkills: ['Formwork', 'Scaffolding'], overseasCountries: ['Oman', 'Qatar'], englishLevel: 'Working', locationReady: true, drivingLicense: true, availability: 'Available now', source: 'Walk-in', status: 'selected', fitScore: 89,
    documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'verified' }, lastInterview: { date: '14 Sep 2026', interviewer: 'Aruna Wijesinghe', role: 'Shuttering Carpenter', result: 'Passed', score: 91 }, journey: [
      { id: 'e1', date: '16 Sep 2026', title: 'Selected', detail: 'Approved for the project shortlist.', tone: 'positive' },
      { id: 'e2', date: '14 Sep 2026', title: 'Interview passed', detail: 'Technical and practical tests passed.', tone: 'positive' },
    ], createdAt: '2026-09-10',
  },
  {
    id: 'cand-004', reference: 'CA-1004', name: 'Tharindu Fernando', phone: '+94 78 300 1144', passportNumber: 'N8XXXX09', age: 27, location: 'Negombo', profession: 'Tile Mason', originalProfession: 'Mason', experienceYears: 4,
    secondarySkills: ['Tile', 'Grouting'], overseasCountries: [], englishLevel: 'Basic', locationReady: true, drivingLicense: false, availability: 'Available now', source: 'Existing database', status: 'reserve', fitScore: 76,
    documents: { passport: 'needs-review', cv: 'verified', tradeCertificate: 'missing' }, lastInterview: { date: '11 Sep 2026', interviewer: 'Nadeesha Fernando', role: 'Tile Mason', result: 'Passed', score: 76 }, journey: [
      { id: 'e1', date: '12 Sep 2026', title: 'Placed on reserve', detail: 'Technical fit met, but certificate is missing.', tone: 'warning' },
    ], createdAt: '2026-08-28',
  },
  {
    id: 'cand-005', reference: 'CA-1005', name: 'Pradeep Kumara', phone: '+94 75 888 2017', passportNumber: 'N3XXXX90', age: 42, location: 'Matara', profession: 'Painter', originalProfession: 'Painter', experienceYears: 12,
    secondarySkills: ['Spray Paint', 'Putty'], overseasCountries: ['Kuwait'], englishLevel: 'Working', locationReady: false, drivingLicense: true, availability: 'Not available', source: 'Referral', status: 'rejected', fitScore: 61,
    documents: { passport: 'verified', cv: 'verified', tradeCertificate: 'verified' }, lastInterview: { date: '09 Sep 2026', interviewer: 'Suresh Perera', role: 'Painter', result: 'Failed', score: 61, note: 'Finish quality below the current client requirement.' }, rejectionReason: 'Client requirement', rejectionNote: 'Practical finish quality did not meet the current client acceptance level.', journey: [
      { id: 'e1', date: '09 Sep 2026', title: 'Rejected', detail: 'Client requirement: finish quality below threshold.', tone: 'negative' },
    ], createdAt: '2026-08-21',
  },
];

const initialState: CandidateState = { loadState: 'loading', errorMessage: null, candidates: [], filters: { search: '', status: 'all', profession: 'all' }, selectedCandidateId: null, isAddDrawerOpen: false, rejectionCandidateId: null };

const candidateReducer = (state: CandidateState, action: CandidateAction): CandidateState => {
  switch (action.type) {
    case 'HYDRATE': return { ...state, loadState: 'success', errorMessage: null, candidates: action.candidates, selectedCandidateId: action.candidates[0]?.id ?? null };
    case 'LOAD_ERROR': return { ...state, loadState: 'error', errorMessage: action.message };
    case 'SET_SEARCH': return { ...state, filters: { ...state.filters, search: action.value } };
    case 'SET_STATUS_FILTER': return { ...state, filters: { ...state.filters, status: action.value } };
    case 'SET_PROFESSION_FILTER': return { ...state, filters: { ...state.filters, profession: action.value } };
    case 'SELECT_CANDIDATE': return { ...state, selectedCandidateId: action.candidateId };
    case 'OPEN_ADD_DRAWER': return { ...state, isAddDrawerOpen: true };
    case 'CLOSE_ADD_DRAWER': return { ...state, isAddDrawerOpen: false };
    case 'ADD_CANDIDATE': return { ...state, candidates: [action.candidate, ...state.candidates], selectedCandidateId: action.candidate.id, isAddDrawerOpen: false };
    case 'UPDATE_STATUS': return { ...state, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: action.status, journey: [{ id: crypto.randomUUID(), date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), title: statusTitle(action.status), detail: statusDetail(action.status), tone: statusTone(action.status) }, ...candidate.journey] } : candidate) };
    case 'OPEN_REJECTION_DIALOG': return { ...state, rejectionCandidateId: action.candidateId };
    case 'CLOSE_REJECTION_DIALOG': return { ...state, rejectionCandidateId: null };
    case 'REJECT_CANDIDATE': return { ...state, rejectionCandidateId: null, candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: 'rejected', rejectionReason: action.reason, rejectionNote: action.note, journey: [{ id: crypto.randomUUID(), date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), title: 'Rejected', detail: `${action.reason}: ${action.note}`, tone: 'negative' }, ...candidate.journey] } : candidate) };
    default: return state;
  }
};

const statusTitle = (status: CandidateStatus): string => ({ new: 'Candidate added', screening: 'Screening started', interview: 'Moved to interview', selected: 'Selected', reserve: 'Placed on reserve', rejected: 'Rejected' }[status]);
const statusDetail = (status: CandidateStatus): string => ({ new: 'Candidate is ready for screening.', screening: 'Recruiter is checking job fit.', interview: 'Candidate is ready for interview assessment.', selected: 'Candidate was added to the selection shortlist.', reserve: 'Candidate remains available as a reserve option.', rejected: 'A structured rejection decision was recorded.' }[status]);
const statusTone = (status: CandidateStatus): 'neutral' | 'positive' | 'warning' | 'negative' => status === 'rejected' ? 'negative' : status === 'selected' ? 'positive' : status === 'reserve' || status === 'screening' ? 'warning' : 'neutral';

export const CandidateProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(candidateReducer, initialState);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('buildhire.candidates');
      const parsed: Candidate[] = saved ? JSON.parse(saved) as Candidate[] : seed;
      dispatch({ type: 'HYDRATE', candidates: parsed });
    } catch {
      dispatch({ type: 'LOAD_ERROR', message: 'Candidate data could not be loaded. Retry to restore the local workspace.' });
    }
  }, []);

  useEffect(() => {
    if (state.loadState === 'success') window.localStorage.setItem('buildhire.candidates', JSON.stringify(state.candidates));
  }, [state.candidates, state.loadState]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CandidateContext.Provider value={value}>{children}</CandidateContext.Provider>;
};

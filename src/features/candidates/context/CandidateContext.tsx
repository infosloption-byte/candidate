import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type PropsWithChildren } from 'react';
import type { Candidate, CandidateFilters, CandidateStatus } from '../types/candidate';

export interface CandidateState {
  candidates: Candidate[];
  selectedCandidateId: string;
  filters: CandidateFilters;
  isAddDrawerOpen: boolean;
  rejectionCandidateId: string | null;
}

export type CandidateAction =
  | { type: 'SELECT_CANDIDATE'; candidateId: string }
  | { type: 'SET_SEARCH'; value: string }
  | { type: 'SET_STATUS_FILTER'; value: CandidateStatus | 'all' }
  | { type: 'SET_PROFESSION_FILTER'; value: string }
  | { type: 'OPEN_ADD_DRAWER' }
  | { type: 'CLOSE_ADD_DRAWER' }
  | { type: 'ADD_CANDIDATE'; candidate: Candidate }
  | { type: 'UPDATE_STATUS'; candidateId: string; status: Exclude<CandidateStatus, 'rejected'> }
  | { type: 'OPEN_REJECTION_DIALOG'; candidateId: string }
  | { type: 'CLOSE_REJECTION_DIALOG' }
  | { type: 'REJECT_CANDIDATE'; candidateId: string; reason: string; note: string };

interface CandidateContextValue {
  state: CandidateState;
  dispatch: Dispatch<CandidateAction>;
}

const CandidateContext = createContext<CandidateContextValue | undefined>(undefined);

const initialCandidates: Candidate[] = [
  {
    id: 'cand-001', reference: 'CA-1001', name: 'Kasun Perera', initials: 'KP', profession: 'Mason',
    secondarySkills: ['Plaster', 'Putty', 'Tile'], experienceYears: 9, overseasCountries: ['Qatar', 'UAE'],
    englishLevel: 'Good', location: 'Gampaha', phone: '+94 77 234 8812', email: 'kasun@example.com', age: 34,
    source: 'Referral', status: 'interview', fitScore: 92, fitReasons: ['9 years experience', 'Tile + Putty', 'Overseas experience'],
    availability: 'Available now', expectedSalary: 'LKR 145,000', drivingLicence: true, alcoholRestriction: true,
    experience: [
      { company: 'Al Noor Contracting', country: 'UAE', role: 'Mason', years: 3 },
      { company: 'Qatar Build Group', country: 'Qatar', role: 'Mason / Finishing', years: 4 },
      { company: 'Local contractor', country: 'Sri Lanka', role: 'Mason', years: 2 },
    ],
    documents: { passport: 'verified', cv: 'verified', certificate: 'pending' },
    timeline: [
      { id: 't1', title: 'Interview scheduled', description: 'Mason — Technical interview with Nimal Fernando', date: 'Today, 10:30 AM', tone: 'neutral' },
      { id: 't2', title: 'Shortlisted', description: 'Matched to Dubai Tower Project', date: 'Yesterday', tone: 'positive' },
      { id: 't3', title: 'Profile created', description: 'Added by HR from referral', date: '14 Sep 2026', tone: 'neutral' },
    ],
    createdAt: '14 Sep 2026',
  },
  {
    id: 'cand-002', reference: 'CA-1002', name: 'Ruwan Silva', initials: 'RS', profession: 'Welder',
    secondarySkills: ['Fabrication', 'MIG', 'TIG'], experienceYears: 7, overseasCountries: ['Saudi Arabia'],
    englishLevel: 'Basic', location: 'Colombo', phone: '+94 71 891 3321', email: 'ruwan@example.com', age: 31,
    source: 'Agency', status: 'screening', fitScore: 84, fitReasons: ['7 years experience', 'Fabrication', 'Saudi experience'],
    availability: 'Available in 2 weeks', expectedSalary: 'LKR 170,000', drivingLicence: false, alcoholRestriction: true,
    experience: [
      { company: 'Al Rashed', country: 'Saudi Arabia', role: 'Welder / Fabricator', years: 5 },
      { company: 'Local fabrication shop', country: 'Sri Lanka', role: 'Welder', years: 2 },
    ],
    documents: { passport: 'verified', cv: 'verified', certificate: 'verified' },
    timeline: [
      { id: 't1', title: 'Screening pending', description: 'HR review started', date: 'Today', tone: 'warning' },
      { id: 't2', title: 'Profile created', description: 'Imported from agency shortlist', date: '15 Sep 2026', tone: 'neutral' },
    ],
    createdAt: '15 Sep 2026',
  },
  {
    id: 'cand-003', reference: 'CA-1003', name: 'Chaminda Jayasinghe', initials: 'CJ', profession: 'Shuttering Carpenter',
    secondarySkills: ['Formwork', 'Reading drawings'], experienceYears: 11, overseasCountries: ['Kuwait', 'Qatar'],
    englishLevel: 'Good', location: 'Kurunegala', phone: '+94 76 220 5318', email: 'chaminda@example.com', age: 38,
    source: 'Existing database', status: 'selected', fitScore: 95, fitReasons: ['11 years experience', 'Strong formwork', 'Drawing reading'],
    availability: 'Available now', expectedSalary: 'LKR 160,000', drivingLicence: true, alcoholRestriction: true,
    experience: [
      { company: 'Kuwait Build', country: 'Kuwait', role: 'Shuttering Carpenter', years: 6 },
      { company: 'Gulf Formwork', country: 'Qatar', role: 'Senior Carpenter', years: 3 },
      { company: 'Sri Lankan contractor', country: 'Sri Lanka', role: 'Carpenter', years: 2 },
    ],
    documents: { passport: 'verified', cv: 'verified', certificate: 'verified' },
    timeline: [
      { id: 't1', title: 'Selected', description: 'Approved for Project K-18', date: 'Today, 9:12 AM', tone: 'positive' },
      { id: 't2', title: 'Interview passed', description: 'Technical score 91%', date: '16 Sep 2026', tone: 'positive' },
    ],
    createdAt: '02 Sep 2026',
  },
  {
    id: 'cand-004', reference: 'CA-1004', name: 'Dinesh Fernando', initials: 'DF', profession: 'Tile Mason',
    secondarySkills: ['Grouting', 'Waterproofing'], experienceYears: 6, overseasCountries: ['UAE'],
    englishLevel: 'Basic', location: 'Kalutara', phone: '+94 72 482 1120', email: 'dinesh@example.com', age: 29,
    source: 'Walk-in', status: 'new', fitScore: 76, fitReasons: ['6 years experience', 'Waterproofing', 'UAE experience'],
    availability: 'Available now', expectedSalary: 'LKR 135,000', drivingLicence: false, alcoholRestriction: true,
    experience: [
      { company: 'Dubai Finishers', country: 'UAE', role: 'Tile Mason', years: 4 },
      { company: 'Local builder', country: 'Sri Lanka', role: 'Tile Mason', years: 2 },
    ],
    documents: { passport: 'pending', cv: 'verified', certificate: 'pending' },
    timeline: [{ id: 't1', title: 'New candidate', description: 'Walk-in registration completed', date: 'Today', tone: 'neutral' }],
    createdAt: '17 Sep 2026',
  },
  {
    id: 'cand-005', reference: 'CA-1005', name: 'Suresh Kumar', initials: 'SK', profession: 'Painter',
    secondarySkills: ['Spray painting', 'Putty'], experienceYears: 4, overseasCountries: [],
    englishLevel: 'Basic', location: 'Negombo', phone: '+94 70 219 6784', email: 'suresh@example.com', age: 27,
    source: 'Referral', status: 'reserve', fitScore: 72, fitReasons: ['Putty experience', 'Available now'],
    availability: 'Available now', expectedSalary: 'LKR 120,000', drivingLicence: true, alcoholRestriction: true,
    experience: [{ company: 'Prime Decorators', country: 'Sri Lanka', role: 'Painter', years: 4 }],
    documents: { passport: 'verified', cv: 'verified', certificate: 'pending' },
    timeline: [{ id: 't1', title: 'Reserve list', description: 'Held as backup for Painter requirement', date: '16 Sep 2026', tone: 'warning' }],
    createdAt: '10 Sep 2026',
  },
  {
    id: 'cand-006', reference: 'CA-1006', name: 'Nuwan Rathnayake', initials: 'NR', profession: 'Mason',
    secondarySkills: ['Block work'], experienceYears: 3, overseasCountries: [],
    englishLevel: 'Basic', location: 'Matara', phone: '+94 75 621 9044', email: 'nuwan@example.com', age: 24,
    source: 'Walk-in', status: 'rejected', fitScore: 51, fitReasons: ['3 years experience'],
    availability: 'Available now', expectedSalary: 'LKR 115,000', drivingLicence: false, alcoholRestriction: false,
    experience: [{ company: 'Local contractor', country: 'Sri Lanka', role: 'Mason helper', years: 3 }],
    documents: { passport: 'missing', cv: 'verified', certificate: 'missing' },
    timeline: [
      { id: 't1', title: 'Rejected', description: 'Insufficient finishing experience for current requirement', date: '15 Sep 2026', tone: 'negative' },
      { id: 't2', title: 'Technical interview', description: 'Score 51%', date: '15 Sep 2026', tone: 'negative' },
    ],
    createdAt: '11 Sep 2026', rejectionReason: 'Insufficient finishing experience',
  },
];

const initialState: CandidateState = {
  candidates: initialCandidates,
  selectedCandidateId: initialCandidates[0]?.id ?? '',
  filters: { search: '', status: 'all', profession: 'all' },
  isAddDrawerOpen: false,
  rejectionCandidateId: null,
};

const reducer = (state: CandidateState, action: CandidateAction): CandidateState => {
  switch (action.type) {
    case 'SELECT_CANDIDATE':
      return { ...state, selectedCandidateId: action.candidateId };
    case 'SET_SEARCH':
      return { ...state, filters: { ...state.filters, search: action.value } };
    case 'SET_STATUS_FILTER':
      return { ...state, filters: { ...state.filters, status: action.value } };
    case 'SET_PROFESSION_FILTER':
      return { ...state, filters: { ...state.filters, profession: action.value } };
    case 'OPEN_ADD_DRAWER':
      return { ...state, isAddDrawerOpen: true };
    case 'CLOSE_ADD_DRAWER':
      return { ...state, isAddDrawerOpen: false };
    case 'ADD_CANDIDATE':
      return {
        ...state,
        candidates: [action.candidate, ...state.candidates],
        selectedCandidateId: action.candidate.id,
        isAddDrawerOpen: false,
      };
    case 'UPDATE_STATUS':
      return {
        ...state,
        candidates: state.candidates.map((candidate) => candidate.id === action.candidateId ? { ...candidate, status: action.status } : candidate),
      };
    case 'OPEN_REJECTION_DIALOG':
      return { ...state, rejectionCandidateId: action.candidateId };
    case 'CLOSE_REJECTION_DIALOG':
      return { ...state, rejectionCandidateId: null };
    case 'REJECT_CANDIDATE':
      return {
        ...state,
        rejectionCandidateId: null,
        candidates: state.candidates.map((candidate) => {
          if (candidate.id !== action.candidateId) return candidate;
          const description = action.note.trim() ? `${action.reason}: ${action.note.trim()}` : action.reason;
          return {
            ...candidate,
            status: 'rejected',
            rejectionReason: description,
            timeline: [
              { id: `rejection-${Date.now()}`, title: 'Rejected', description, date: 'Just now', tone: 'negative' },
              ...candidate.timeline,
            ],
          };
        }),
      };
    default:
      return state;
  }
};

export const CandidateProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState, (seed) => {
    if (typeof window === 'undefined') return seed;
    const stored = window.localStorage.getItem('buildhire.candidates');
    if (!stored) return seed;
    try {
      const parsed = JSON.parse(stored) as Candidate[];
      if (!Array.isArray(parsed) || parsed.length === 0) return seed;
      return { ...seed, candidates: parsed, selectedCandidateId: parsed[0]?.id ?? seed.selectedCandidateId };
    } catch {
      return seed;
    }
  });

  useEffect(() => {
    window.localStorage.setItem('buildhire.candidates', JSON.stringify(state.candidates));
  }, [state.candidates]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <CandidateContext.Provider value={value}>{children}</CandidateContext.Provider>;
};

export const useCandidateContext = () => {
  const context = useContext(CandidateContext);
  if (!context) throw new Error('useCandidateContext must be used inside CandidateProvider.');
  return context;
};

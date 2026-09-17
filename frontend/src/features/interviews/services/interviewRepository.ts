import type { Interview, Interviewer } from '../types/interview';

const STORAGE_KEY = 'buildhire.interviews';
const INTERVIEWER_KEY = 'buildhire.interviewers';

export const interviewerSeed: Interviewer[] = [
  { id: 'int-001', name: 'Nadeesha Fernando', role: 'Senior Technical Interviewer', specialties: ['Mason', 'Tile Mason', 'Plaster'], active: true },
  { id: 'int-002', name: 'Aruna Wijesinghe', role: 'Carpentry & Formwork Interviewer', specialties: ['Shuttering Carpenter', 'Carpenter', 'Scaffolding'], active: true },
  { id: 'int-003', name: 'Suresh Perera', role: 'Finishing Trades Interviewer', specialties: ['Painter', 'Putty', 'Finishing'], active: true },
  { id: 'int-004', name: 'Kasun Jayawardena', role: 'Welding & Fabrication Interviewer', specialties: ['Welder', 'Fabricator', 'Arc Welding'], active: true },
];

const makeCriterion = (id: string, label: string, weight: number) => ({ id, label, weight, score: null, note: '' });
const masonScorecard = () => ({ templateId: 'mason-standard', criteria: [makeCriterion('technical', 'Technical trade skill', 30), makeCriterion('experience', 'Relevant experience', 15), makeCriterion('secondary', 'Secondary skills', 15), makeCriterion('safety', 'Safety awareness', 15), makeCriterion('quality', 'Finish quality', 10), makeCriterion('english', 'English / communication', 5), makeCriterion('tools', 'Tools & methods', 10)] });
const carpentryScorecard = () => ({ templateId: 'carpentry-standard', criteria: [makeCriterion('technical', 'Formwork / carpentry skill', 30), makeCriterion('experience', 'Relevant experience', 15), makeCriterion('drawing', 'Drawing understanding', 15), makeCriterion('safety', 'Safety awareness', 15), makeCriterion('quality', 'Accuracy / finish', 10), makeCriterion('english', 'English / communication', 5), makeCriterion('tools', 'Tools & methods', 10)] });
const weldingScorecard = () => ({ templateId: 'welding-standard', criteria: [makeCriterion('technical', 'Welding technique', 30), makeCriterion('experience', 'Relevant experience', 15), makeCriterion('fabrication', 'Fabrication skill', 15), makeCriterion('safety', 'Safety awareness', 15), makeCriterion('quality', 'Weld quality', 10), makeCriterion('english', 'English / communication', 5), makeCriterion('tools', 'Tools & methods', 10)] });

const practicalItems = (profession: string) => {
  if (profession.toLowerCase().includes('mason') || profession.toLowerCase().includes('tile')) {
    return [
      { id: 'practical-block', label: 'Block / masonry work', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-finish', label: 'Plaster / finish quality', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-tile', label: 'Tile alignment / grouting', required: false, result: 'not-started' as const, note: '' },
      { id: 'practical-safety', label: 'Safe tool handling', required: true, result: 'not-started' as const, note: '' },
    ];
  }
  if (profession.toLowerCase().includes('welder')) {
    return [
      { id: 'practical-weld', label: 'Weld execution', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-fabrication', label: 'Cut / fit / fabrication', required: true, result: 'not-started' as const, note: '' },
      { id: 'practical-safety', label: 'PPE and safe handling', required: true, result: 'not-started' as const, note: '' },
    ];
  }
  return [
    { id: 'practical-trade', label: 'Core practical trade task', required: true, result: 'not-started' as const, note: '' },
    { id: 'practical-quality', label: 'Accuracy / finish quality', required: true, result: 'not-started' as const, note: '' },
    { id: 'practical-safety', label: 'PPE and safe handling', required: true, result: 'not-started' as const, note: '' },
  ];
};

export const createSeedInterviews = (): Interview[] => [
  {
    id: 'iv-001', reference: 'IV-1001', candidateId: 'cand-001', candidateName: 'Kasun Perera', profession: 'Mason', type: 'Technical', status: 'evaluation', date: '18 Sep 2026', time: '09:30', durationMinutes: 45, location: 'Colombo Interview Room 1', interviewers: [interviewerSeed[0]], notes: 'Client requires strong finish work.', scorecard: masonScorecard(), practicalTest: practicalItems('Mason'), decision: { decision: 'pending', reason: '', note: '' }, createdAt: '2026-09-17T08:00:00Z',
  },
  {
    id: 'iv-002', reference: 'IV-1002', candidateId: 'cand-003', candidateName: 'Chaminda Jayasuriya', profession: 'Shuttering Carpenter', type: 'Practical', status: 'scheduled', date: '18 Sep 2026', time: '11:00', durationMinutes: 60, location: 'Practical Yard A', interviewers: [interviewerSeed[1]], notes: 'Focus on formwork accuracy.', scorecard: carpentryScorecard(), practicalTest: practicalItems('Shuttering Carpenter'), decision: { decision: 'pending', reason: '', note: '' }, createdAt: '2026-09-17T08:15:00Z',
  },
  {
    id: 'iv-003', reference: 'IV-1003', candidateId: 'cand-002', candidateName: 'Ruwan Silva', profession: 'Welder', type: 'Screening', status: 'scheduled', date: '19 Sep 2026', time: '10:00', durationMinutes: 30, location: 'Colombo Interview Room 2', interviewers: [interviewerSeed[3]], notes: '', scorecard: weldingScorecard(), practicalTest: practicalItems('Welder'), decision: { decision: 'pending', reason: '', note: '' }, createdAt: '2026-09-17T09:00:00Z',
  },
];

export const loadInterviews = async (): Promise<Interview[]> => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return createSeedInterviews();
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed as Interview[] : createSeedInterviews();
};

export const saveInterviews = async (interviews: Interview[]): Promise<void> => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(interviews));
};

export const loadInterviewers = async (): Promise<Interviewer[]> => {
  const raw = window.localStorage.getItem(INTERVIEWER_KEY);
  if (!raw) return interviewerSeed;
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed as Interviewer[] : interviewerSeed;
};

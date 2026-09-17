import { Icon } from '../../../shared/components/Icon';

const interviews = [
  { time: '10:30', candidate: 'Kasun Perera', role: 'Mason', interviewer: 'Nimal Fernando', status: 'Needs preparation' },
  { time: '12:00', candidate: 'Ruwan Silva', role: 'Welder', interviewer: 'Shanika Ranasinghe', status: 'Scheduled' },
  { time: '15:30', candidate: 'Dinesh Fernando', role: 'Tile Mason', interviewer: 'Nimal Fernando', status: 'Scheduled' },
];

export const InterviewsPage = () => (
  <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><section className="mx-auto max-w-6xl"><div><p className="text-sm font-semibold text-blue-600">Interview workspace</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Today’s interviews</h1><p className="mt-2 text-sm text-slate-500">One short queue for scheduling and scorecard follow-up.</p></div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><h2 className="text-sm font-semibold text-slate-900">17 September 2026</h2><p className="mt-1 text-xs text-slate-500">3 interviews · 2 technical · 1 practical</p></div><button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"><Icon name="calendar" size={16} /> Calendar</button></div><div className="mt-2 divide-y divide-slate-100">{interviews.map((interview) => <div key={`${interview.time}-${interview.candidate}`} className="grid gap-3 py-4 sm:grid-cols-[90px_1fr_auto] sm:items-center"><div className="text-sm font-bold text-slate-900">{interview.time}</div><div><p className="text-sm font-semibold text-slate-800">{interview.candidate} <span className="font-normal text-slate-400">· {interview.role}</span></p><p className="mt-1 text-xs text-slate-500">Interviewer: {interview.interviewer}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${interview.status === 'Needs preparation' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{interview.status}</span></div>)}</div></div></section></main>
);

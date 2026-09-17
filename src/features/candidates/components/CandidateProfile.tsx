import type { Candidate } from '../types/candidate';
import { Icon } from '../../../shared/components/Icon';
import { StatusBadge } from '../../../shared/components/StatusBadge';

interface CandidateProfileProps {
  candidate: Candidate | null;
  onScreen: (candidateId: string) => void;
  onInterview: (candidateId: string) => void;
  onSelect: (candidateId: string) => void;
  onReserve: (candidateId: string) => void;
  onReject: (candidateId: string) => void;
}

const toneClasses = { neutral: 'bg-slate-200', positive: 'bg-emerald-500', warning: 'bg-amber-500', negative: 'bg-rose-500' };
const documentLabel = (status: Candidate['documents']['passport']) => status === 'verified' ? 'Verified' : status === 'pending' ? 'Pending' : 'Missing';

export const CandidateProfile = ({ candidate, onScreen, onInterview, onSelect, onReserve, onReject }: CandidateProfileProps) => {
  if (!candidate) return <div className="flex min-h-[520px] items-center justify-center p-8 text-center text-slate-500">Select a candidate to view their profile.</div>;

  const currentStatus = candidate.status;
  const isClosed = currentStatus === 'selected' || currentStatus === 'reserve' || currentStatus === 'rejected';

  return (
    <section aria-labelledby="candidate-profile-title" className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">{candidate.initials}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h2 id="candidate-profile-title" className="text-xl font-bold tracking-tight text-slate-950">{candidate.name}</h2><StatusBadge status={candidate.status} /></div>
              <p className="mt-1 text-sm text-slate-500">{candidate.profession} · {candidate.reference}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Icon name="map-pin" size={14} /> {candidate.location}</span><span className="inline-flex items-center gap-1.5"><Icon name="phone" size={14} /> {candidate.phone}</span></div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2"><Icon name="sparkles" size={16} className="text-blue-600" /><div><p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Current fit</p><p className="text-lg font-bold leading-5 text-blue-700">{candidate.fitScore || '—'}%</p></div></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {currentStatus === 'new' && <button type="button" onClick={() => onScreen(candidate.id)} className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">Start screening</button>}
          {(currentStatus === 'screening' || currentStatus === 'new') && <button type="button" onClick={() => onInterview(candidate.id)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Move to interview</button>}
          {!isClosed && <button type="button" onClick={() => onSelect(candidate.id)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">Select</button>}
          {!isClosed && <button type="button" onClick={() => onReserve(candidate.id)} className="rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100">Reserve</button>}
          {currentStatus !== 'rejected' && <button type="button" onClick={() => onReject(candidate.id)} className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Reject</button>}
        </div>
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">Why this candidate fits</p><p className="text-xs text-slate-500">Quick evidence for a manager or interviewer</p></div><Icon name="shield" size={18} className="text-blue-600" /></div><div className="grid gap-2 sm:grid-cols-3">{candidate.fitReasons.map((reason) => <div key={reason} className="rounded-xl border border-white bg-white px-3 py-3 text-xs font-medium text-slate-700 shadow-sm"><span className="mr-2 text-emerald-500">✓</span>{reason}</div>)}</div></section>
            <section className="rounded-2xl border border-slate-200 p-4"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">Professional snapshot</p><span className="text-xs text-slate-400">Updated {candidate.createdAt}</span></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><div><p className="text-xs text-slate-500">Experience</p><p className="mt-1 text-sm font-semibold text-slate-900">{candidate.experienceYears} years</p></div><div><p className="text-xs text-slate-500">English</p><p className="mt-1 text-sm font-semibold text-slate-900">{candidate.englishLevel}</p></div><div><p className="text-xs text-slate-500">Availability</p><p className="mt-1 text-sm font-semibold text-slate-900">{candidate.availability}</p></div><div><p className="text-xs text-slate-500">Driving licence</p><p className="mt-1 text-sm font-semibold text-slate-900">{candidate.drivingLicence ? 'Yes' : 'No'}</p></div></div><div className="mt-4"><p className="text-xs text-slate-500">Skills</p><div className="mt-2 flex flex-wrap gap-2">{candidate.secondarySkills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{skill}</span>)}</div></div><div className="mt-4"><p className="text-xs text-slate-500">Overseas experience</p><div className="mt-2 flex flex-wrap gap-2">{candidate.overseasCountries.length ? candidate.overseasCountries.map((country) => <span key={country} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"><Icon name="globe" size={13} />{country}</span>) : <span className="text-sm text-slate-400">No overseas experience recorded</span>}</div></div></section>
            <section className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-900">Work history</p><div className="mt-4 space-y-4">{candidate.experience.length ? candidate.experience.map((item) => <div key={`${item.company}-${item.role}`} className="flex gap-3"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" /><div><p className="text-sm font-semibold text-slate-800">{item.role}</p><p className="text-xs text-slate-500">{item.company} · {item.country} · {item.years} yrs</p></div></div>) : <p className="text-sm text-slate-400">No work history recorded yet.</p>}</div></section>
          </div>
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-900">Documents</p><p className="text-xs text-slate-500">Ready-to-review status</p></div><Icon name="file" size={18} className="text-slate-400" /></div><div className="mt-4 space-y-2">{Object.entries(candidate.documents).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-sm capitalize text-slate-700">{key}</span><span className={`text-xs font-semibold ${value === 'verified' ? 'text-emerald-600' : value === 'pending' ? 'text-amber-600' : 'text-rose-600'}`}>{documentLabel(value)}</span></div>)}</div></section>
            <section className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-900">Candidate journey</p><div className="relative mt-5 space-y-6 pl-4"><div className="absolute bottom-2 left-[6px] top-2 w-px bg-slate-200" />{candidate.timeline.map((item) => <div key={item.id} className="relative"><span className={`absolute -left-[4px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${toneClasses[item.tone]}`} /><div className="pl-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{item.title}</p><span className="text-[11px] text-slate-400">{item.date}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p></div></div>)}</div></section>
            {candidate.rejectionReason && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-800">Last rejection reason</p><p className="mt-1 text-sm leading-6 text-rose-700">{candidate.rejectionReason}</p></section>}
          </div>
        </div>
      </div>
    </section>
  );
};

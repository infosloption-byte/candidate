import { Icon } from '../../../shared/components/Icon';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { CandidateDuplicatePanel } from './CandidateDuplicatePanel';
import { CandidateTagEditor } from './CandidateTagEditor';
import type { Candidate, CandidateDuplicateMatch, CandidateStatus, DocumentState } from '../types/candidate';

interface CandidateProfileProps {
  candidate: Candidate | null;
  allCandidates: Candidate[];
  duplicateMatches: CandidateDuplicateMatch[];
  onBack?: () => void;
  onOpenDuplicate: (candidateId: string) => void;
  onAddTag: (candidateId: string, tag: string) => void;
  onRemoveTag: (candidateId: string, tag: string) => void;
  onScreen: (id: string) => void;
  onInterview: (id: string) => void;
  onSelect: (id: string) => void;
  onReserve: (id: string) => void;
  onReject: (id: string) => void;
}

const statusCopy: Record<CandidateStatus, { title: string; text: string }> = {
  new: { title: 'Ready to screen', text: 'Start with a quick eligibility and job-fit check.' },
  screening: { title: 'Screening in progress', text: 'Confirm trade experience and readiness before scheduling the interview.' },
  interview: { title: 'Interview stage', text: 'The candidate is ready for the structured interview and evaluation scorecard.' },
  selected: { title: 'Selected', text: 'The candidate is on the selected shortlist. Keep documents and next steps visible.' },
  reserve: { title: 'Reserve candidate', text: 'This candidate is a usable backup option while remaining available for other work.' },
  rejected: { title: 'Decision recorded', text: 'The rejection reason stays attached to this candidate for future reference.' },
};

const documentLabel = (state: DocumentState) => state === 'verified' ? 'Verified' : state === 'needs-review' ? 'Needs review' : 'Missing';
const documentStyle = (state: DocumentState) => state === 'verified' ? 'bg-emerald-50 text-emerald-700' : state === 'needs-review' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';

export const CandidateProfile = ({ candidate, allCandidates, duplicateMatches, onBack, onOpenDuplicate, onAddTag, onRemoveTag, onScreen, onInterview, onSelect, onReserve, onReject }: CandidateProfileProps) => {
  if (!candidate) return <section className="hidden min-h-full place-items-center bg-slate-50 p-8 xl:grid"><div className="max-w-sm text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-slate-300 shadow-sm"><Icon name="users" size={25}/></div><h2 className="mt-4 text-base font-bold text-slate-800">Select a candidate</h2><p className="mt-1 text-sm leading-6 text-slate-500">Choose someone from the directory to review their profile and workflow.</p></div></section>;

  const initials = candidate.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const copy = statusCopy[candidate.status];
  const canScreen = candidate.status === 'new';
  const canInterview = candidate.status === 'screening';
  const canDecide = candidate.status === 'interview' || candidate.status === 'screening';
  const tags = candidate.tags ?? [];

  return (
    <section className="min-h-full bg-slate-50" aria-label={`Profile for ${candidate.name}`}>
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          {onBack && <button type="button" onClick={onBack} aria-label="Back to candidate list" className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 xl:hidden"><Icon name="arrow-left" size={17}/></button>}
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-900 text-sm font-black text-white">{initials}</div>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-black tracking-tight text-slate-950">{candidate.name}</h1><StatusBadge status={candidate.status} compact /></div><p className="mt-1 text-sm text-slate-500">{candidate.profession} · {candidate.experienceYears} years · {candidate.reference}</p><p className="mt-1 text-xs text-slate-400">Added from {candidate.source.toLowerCase()} · {candidate.location}</p></div>
          <button type="button" aria-label="More candidate actions" className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><Icon name="more" size={18}/></button>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800">{copy.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{copy.text}</p></div><div className="flex items-center gap-2"><div className="grid size-11 place-items-center rounded-xl bg-white font-black text-slate-900 shadow-sm">{candidate.fitScore ? `${candidate.fitScore}%` : '—'}</div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Job fit</p><p className="text-xs font-bold text-slate-700">Based on current profile</p></div></div></div></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {canScreen && <button type="button" onClick={() => onScreen(candidate.id)} className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Start screening</button>}
          {canInterview && <button type="button" onClick={() => onInterview(candidate.id)} className="rounded-xl bg-cyan-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-cyan-700">Schedule interview</button>}
          {canDecide && <><button type="button" onClick={() => onSelect(candidate.id)} className="rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">Select</button><button type="button" onClick={() => onReserve(candidate.id)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Reserve</button><button type="button" onClick={() => onReject(candidate.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100">Reject</button></>}
          {(candidate.status === 'selected' || candidate.status === 'reserve' || candidate.status === 'rejected') && <span className="rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">Decision saved to timeline</span>}
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <CandidateDuplicatePanel matches={duplicateMatches} candidates={allCandidates} onOpenCandidate={onOpenDuplicate} />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Readiness snapshot</h2><p className="mt-0.5 text-xs text-slate-500">The quick facts recruiters check most often.</p></div><Icon name="sparkles" size={18} className="text-cyan-600"/></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">English</p><p className="mt-1 text-sm font-bold text-slate-800">{candidate.englishLevel}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Availability</p><p className="mt-1 text-sm font-bold text-slate-800">{candidate.availability.replace('Within ', '< ').replace('Available now', 'Now')}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Driving</p><p className="mt-1 text-sm font-bold text-slate-800">{candidate.drivingLicense ? 'Yes' : 'No'}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Location ready</p><p className="mt-1 text-sm font-bold text-slate-800">{candidate.locationReady ? 'Yes' : 'Check'}</p></div>
        </div></section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-sm font-black text-slate-900">Professional profile</h2><div className="mt-4 space-y-3 text-xs"><div className="flex justify-between gap-4"><span className="text-slate-400">Primary profession</span><span className="font-bold text-slate-800">{candidate.profession}</span></div><div className="flex justify-between gap-4"><span className="text-slate-400">Original profession</span><span className="font-bold text-slate-800">{candidate.originalProfession}</span></div><div className="flex justify-between gap-4"><span className="text-slate-400">Overseas experience</span><span className="font-bold text-slate-800">{candidate.overseasCountries.length ? candidate.overseasCountries.join(', ') : 'None recorded'}</span></div><div><span className="text-slate-400">Secondary skills</span><div className="mt-2 flex flex-wrap gap-1.5">{candidate.secondarySkills.length ? candidate.secondarySkills.map((skill) => <span key={skill} className="rounded-lg bg-cyan-50 px-2.5 py-1.5 font-semibold text-cyan-700">{skill}</span>) : <span className="text-slate-500">No secondary skills recorded</span>}</div></div><CandidateTagEditor candidateId={candidate.id} tags={tags} onAdd={onAddTag} onRemove={onRemoveTag}/></div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-sm font-black text-slate-900">Documents</h2><div className="mt-4 space-y-2">{([['Passport', candidate.documents.passport], ['CV', candidate.documents.cv], ['Trade certificate', candidate.documents.tradeCertificate]] as const).map(([label, status]) => <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><div className="flex items-center gap-2"><Icon name="file" size={15} className="text-slate-400"/><span className="text-xs font-semibold text-slate-700">{label}</span></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${documentStyle(status)}`}>{documentLabel(status)}</span></div>)}</div><p className="mt-3 text-[11px] leading-5 text-slate-400">Documents become uploadable and verifiable after the backend milestone.</p></section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Last interview</h2><p className="mt-0.5 text-xs text-slate-500">Keep interview evidence beside the candidate decision.</p></div>{candidate.lastInterview && <span className="text-lg font-black text-slate-900">{candidate.lastInterview.score}%</span>}</div>{candidate.lastInterview ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Date</p><p className="mt-1 text-xs font-bold text-slate-800">{candidate.lastInterview.date}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Interviewer</p><p className="mt-1 text-xs font-bold text-slate-800">{candidate.lastInterview.interviewer}</p></div><div><p className="text-[10px] uppercase tracking-wider text-slate-400">Result</p><p className="mt-1 text-xs font-bold text-slate-800">{candidate.lastInterview.result}</p></div>{candidate.lastInterview.note && <p className="sm:col-span-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{candidate.lastInterview.note}</p>}</div> : <div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No interview recorded yet. Start screening first, then schedule an interview.</div>}</section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-sm font-black text-slate-900">Candidate journey</h2><div className="mt-4">{candidate.journey.map((event, index) => <div key={event.id} className="relative flex gap-3 pb-5 last:pb-0"><div className="relative flex w-5 shrink-0 justify-center"><span className={`mt-1.5 size-2.5 rounded-full ${event.tone === 'positive' ? 'bg-emerald-500' : event.tone === 'negative' ? 'bg-rose-500' : event.tone === 'warning' ? 'bg-amber-500' : 'bg-slate-300'}`} />{index < candidate.journey.length - 1 && <span className="absolute top-4 h-full w-px bg-slate-200" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-800">{event.title}</p><time className="text-[10px] text-slate-400">{event.date}</time></div><p className="mt-1 text-xs leading-5 text-slate-500">{event.detail}</p></div></div>)}</div></section>
      </div>
    </section>
  );
};

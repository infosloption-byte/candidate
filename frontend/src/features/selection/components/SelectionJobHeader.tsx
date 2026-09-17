import { Icon } from '../../../shared/components/Icon';
import type { SelectionJob } from '../types/selection';

interface SelectionJobHeaderProps {
  job: SelectionJob;
  selectedCount: number;
  reserveCount: number;
  recommendedCount: number;
  remaining: number;
  onChangeJob: (jobId: string) => void;
  jobs: SelectionJob[];
}

export const SelectionJobHeader = ({ job, selectedCount, reserveCount, recommendedCount, remaining, onChangeJob, jobs }: SelectionJobHeaderProps) => (
  <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-black text-cyan-700"><Icon name="target" size={11}/> Selection board</span>
          <span className="text-[10px] font-bold text-slate-400">{job.client}</span>
        </div>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{job.title}</h1>
        <p className="mt-1 text-xs text-slate-500">{job.location} · Minimum {job.requiredExperience} years · {job.requiredSkills.length > 0 ? `Skills: ${job.requiredSkills.join(', ')}` : 'No additional skill requirements'}</p>
      </div>
      <label className="flex w-full max-w-sm items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Job</span>
        <select aria-label="Select job requirement" value={job.id} onChange={(event) => onChangeJob(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-800 outline-none">
          {jobs.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Open positions</p><p className="mt-1 text-lg font-black text-slate-900">{job.openings}</p></div>
      <div className="rounded-2xl bg-emerald-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Selected</p><p className="mt-1 text-lg font-black text-emerald-800">{selectedCount}</p></div>
      <div className="rounded-2xl bg-amber-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Reserve</p><p className="mt-1 text-lg font-black text-amber-800">{reserveCount}</p></div>
      <div className="rounded-2xl bg-cyan-50 p-3"><p className="text-[9px] font-bold uppercase tracking-wider text-cyan-600">Still available</p><p className="mt-1 text-lg font-black text-cyan-800">{remaining}<span className="ml-1 text-[10px] font-bold text-slate-400">· {recommendedCount} to review</span></p></div>
    </div>
  </header>
);

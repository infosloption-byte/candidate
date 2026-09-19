import { Icon } from '../../../shared/components/Icon';
import { useAppContext } from '../../../app/hooks/useAppContext';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';
import { useRef } from 'react';
import { useJobsWorkspace } from '../hooks/useJobsWorkspace';
import { usePermissions } from '../../auth/hooks/usePermissions';

const statusTone: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  filled: 'bg-cyan-100 text-cyan-700',
  closed: 'bg-rose-100 text-rose-700',
};

export const JobsPage = () => {
  const { dispatch } = useAppContext();
  const { state, visibleJobs, search, status, editorOpen, editingId, draft, actions } = useJobsWorkspace();
  const { can } = usePermissions();
  const canManage = can('job.manage');
  const canSelect = can('selection.view');
  const canAllocate = can('allocation.view');
  const editorRef = useFocusTrap<HTMLDivElement>({ enabled: editorOpen, onEscape: actions.closeEditor });

  if (state.loadState === 'loading') return <section className="mx-auto max-w-7xl p-6"><div className="animate-pulse space-y-4"><div className="h-32 rounded-3xl bg-slate-200"/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((n)=><div key={n} className="h-56 rounded-2xl bg-slate-200"/>)}</div></div></section>;
  if (state.loadState === 'error') return <section className="mx-auto max-w-3xl p-6"><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center"><Icon name="alert" size={28} className="mx-auto text-rose-600"/><h1 className="mt-4 text-xl font-black text-slate-950">Jobs could not load</h1><p className="mt-2 text-sm text-slate-500">{state.errorMessage}</p><div className="mt-5 flex justify-center gap-2"><button type="button" onClick={actions.retryLoad} title="Retry loading jobs" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700"><Icon name="refresh" size={15}/>Retry</button><button type="button" onClick={canManage ? actions.openCreate : undefined} title={canManage ? "Create a job requirement" : "Job creation is restricted for this role"} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Create job</button></div></div></section>;

  return <section className="mx-auto max-w-7xl p-4 sm:p-6">
    <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Manpower planning</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Manage jobs, vacancies and recruitment demand.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Define the role requirements that feed selection, allocation and interview planning.</p></div><button type="button" onClick={actions.openCreate} title={canManage ? "Create a new job requirement" : "Job creation is restricted for this role"} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white"><Icon name="plus" size={16}/>Create job</button></div>
      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 md:flex-row"><label className="min-w-0 flex-1"><span className="mb-1 block text-[11px] font-bold text-slate-500">Search jobs</span><input value={search} onChange={(event)=>actions.setSearch(event.target.value)} placeholder="Project, client, trade, location…" title="Search job requirements" className="field-input mt-0"/></label><label className="md:w-56"><span className="mb-1 block text-[11px] font-bold text-slate-500">Status</span><select value={status} onChange={(event)=>actions.setStatus(event.target.value as typeof status)} title="Filter jobs by status" className="field-input mt-0"><option value="all">All statuses</option><option value="draft">Draft</option><option value="open">Open</option><option value="paused">Paused</option><option value="filled">Filled</option><option value="closed">Closed</option></select></label></div>
    </header>
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleJobs.length === 0 ? <div className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Icon name="briefcase" size={28} className="mx-auto text-slate-400"/><h2 className="mt-3 text-sm font-black text-slate-900">No jobs match the current filters</h2><p className="mt-1 text-xs text-slate-500">Create a new requirement or clear the search.</p></div> : visibleJobs.map((job) => {
        const selected = state.records.filter((record)=>record.jobId===job.id && record.decision==='selected').length;
        return <article key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{job.project}</p><h2 className="mt-1 text-sm font-black text-slate-950">{job.title}</h2></div><span className={'rounded-full px-2.5 py-1 text-[10px] font-bold ' + (statusTone[job.status ?? 'open'])}>{job.status ?? 'open'}</span></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Openings</span><strong className="mt-1 block text-slate-900">{job.openings}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-slate-400">Selected</span><strong className="mt-1 block text-slate-900">{selected}</strong></div></div>
          <dl className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-3"><dt className="text-slate-400">Client</dt><dd className="font-semibold text-slate-700">{job.client}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Location</dt><dd className="font-semibold text-slate-700">{job.location}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-400">Experience</dt><dd className="font-semibold text-slate-700">{job.requiredExperience}+ years</dd></div><div><dt className="text-slate-400">Required skills</dt><dd className="mt-1 flex flex-wrap gap-1">{job.requiredSkills.map((skill)=><span key={skill} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{skill}</span>)}</dd></div></dl>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={()=>canManage && actions.openEdit(job)} title={canManage ? 'Edit ' + job.title : 'Editing is restricted for this role'} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50">Edit</button><button type="button" onClick={()=>canSelect && dispatch({type:'SET_VIEW',view:'selection'})} title={canSelect ? "Open candidate selection for this job" : "Selection is restricted for this role"} className="rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white">Selection</button><button type="button" onClick={()=>canAllocate && dispatch({type:'SET_VIEW',view:'allocation'})} title={canAllocate ? "Open cross-job candidate allocation" : "Allocation is restricted for this role"} className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] font-bold text-cyan-800">Allocate</button>{job.status !== 'closed' && canManage && <button type="button" onClick={()=>actions.closeJob(job.id)} title={'Close ' + job.title} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700">Close</button>}</div>
        </article>;
      })}
    </div>

    {editorOpen && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-2 sm:items-center sm:justify-center sm:p-6"><div ref={editorRef} tabIndex={-1} className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="job-editor-title"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Job requirement</p><h2 id="job-editor-title" className="mt-1 text-xl font-black text-slate-950">{editingId ? 'Edit job' : 'Create job'}</h2></div><button type="button" onClick={actions.closeEditor} title="Close job editor" aria-label="Close job editor" className="grid size-9 place-items-center rounded-xl border border-slate-200"><Icon name="x" size={17}/></button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {([['title','Job title'],['project','Project'],['client','Client'],['location','Location'],['profession','Profession'],['openings','Openings'],['requiredExperience','Minimum experience'] ] as const).map(([key,label])=><label key={key} className="text-xs font-bold text-slate-600">{label}<input value={draft[key]} onChange={(event)=>actions.setDraft({[key]:event.target.value})} type={key==='openings'||key==='requiredExperience'?'number':'text'} className="field-input" min={key==='openings'?'1':'0'}/></label>)}
        <label className="text-xs font-bold text-slate-600">Required skills<input value={draft.requiredSkills} onChange={(event)=>actions.setDraft({requiredSkills:event.target.value})} placeholder="Tile, Putty" className="field-input"/></label>
        <label className="text-xs font-bold text-slate-600">Preferred skills<input value={draft.preferredSkills} onChange={(event)=>actions.setDraft({preferredSkills:event.target.value})} placeholder="Finishing, Grouting" className="field-input"/></label>
        <label className="text-xs font-bold text-slate-600">Start date<input value={draft.startDate} onChange={(event)=>actions.setDraft({startDate:event.target.value})} type="date" className="field-input"/></label>
        <label className="text-xs font-bold text-slate-600">Deadline<input value={draft.deadline} onChange={(event)=>actions.setDraft({deadline:event.target.value})} type="date" className="field-input"/></label>
        <label className="text-xs font-bold text-slate-600 sm:col-span-2">Status<select value={draft.status} onChange={(event)=>actions.setDraft({status:event.target.value as typeof draft.status})} className="field-input"><option value="draft">Draft</option><option value="open">Open</option><option value="paused">Paused</option><option value="filled">Filled</option><option value="closed">Closed</option></select></label>
      </div>
      {actions.editorError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{actions.editorError}</div>}
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={actions.closeEditor} title="Cancel job editing" className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="button" onClick={actions.save} disabled={!canManage} title={canManage ? (editingId ? 'Save job changes' : 'Create this job requirement') : 'Job changes are restricted for this role'} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">{editingId ? 'Save changes' : 'Create job'}</button></div>
    </div></div>}
  </section>;
};

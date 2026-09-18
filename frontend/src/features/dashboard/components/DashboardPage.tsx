import { Icon, type IconName } from '../../../shared/components/Icon';
import { useAppContext } from '../../../app/hooks/useAppContext';
import { useDashboardWorkspace } from '../hooks/useDashboardWorkspace';

const statusIcon: Record<'new' | 'screening' | 'interview' | 'selected' | 'reserve' | 'rejected', IconName> = {
  new: 'users',
  screening: 'search',
  interview: 'calendar',
  selected: 'target',
  reserve: 'clock',
  rejected: 'alert',
};

export const DashboardPage = () => {
  const { dispatch } = useAppContext();
  const { snapshot, loading, hasError, retry } = useDashboardWorkspace();

  if (loading) {
    return <section className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-44 rounded-3xl bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-slate-200" />)}</div>
        <div className="grid gap-4 xl:grid-cols-2"><div className="h-80 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div>
      </div>
    </section>;
  }

  if (hasError) {
    return <section className="mx-auto max-w-3xl p-6">
      <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
        <Icon name="alert" size={28} className="mx-auto text-rose-600" />
        <h1 className="mt-4 text-xl font-black text-slate-950">Dashboard data needs a refresh</h1>
        <p className="mt-2 text-sm text-slate-500">One or more recruitment workspaces could not be loaded.</p>
        <button type="button" title="Retry dashboard data loading" onClick={retry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="refresh" size={15} />Retry</button>
      </div>
    </section>;
  }

  const cards = [
    { label: 'Candidate pool', value: snapshot.totals.candidates, hint: 'Total candidate records', icon: 'users' as const, view: 'candidates' as const },
    { label: 'Available now', value: snapshot.totals.availableNow, hint: 'Ready for immediate discussion', icon: 'clock' as const, view: 'candidates' as const },
    { label: 'Interviews today', value: snapshot.totals.interviewsToday, hint: 'On today\'s schedule', icon: 'calendar' as const, view: 'interviews' as const },
    { label: 'Selected', value: snapshot.totals.selected, hint: 'Current candidate status', icon: 'target' as const, view: 'selection' as const },
  ];

  const approvalTarget = 'selection' as const;

  return <section className="mx-auto max-w-7xl p-4 sm:p-6">
    <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.35fr_.65fr]">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Recruitment control center</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Keep the funnel moving and resolve today's exceptions.</h1>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Daily operational view across candidate intake, onboarding, interviews, documents and selection approval.</p>
          <p className="mt-3 text-xs font-semibold text-slate-400">{snapshot.todayLabel}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" title="Open the candidate directory" onClick={() => dispatch({ type: 'SET_VIEW', view: 'candidates' })} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-slate-100"><Icon name="users" size={16} />Candidates</button>
            <button type="button" title="Open the interview desk" onClick={() => dispatch({ type: 'SET_VIEW', view: 'interviews' })} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/15"><Icon name="calendar" size={16} />Interview desk</button>
            <button type="button" title="Open selection and approvals" onClick={() => dispatch({ type: 'SET_VIEW', view: approvalTarget })} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/15"><Icon name="target" size={16} />Selection</button>
            <button type="button" title="Open recruitment reports" onClick={() => dispatch({ type: 'SET_VIEW', view: 'reports' })} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-bold hover:bg-white/15"><Icon name="chart" size={16} />Reports</button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold text-slate-400">Today's operating load</p>
          <p className="mt-3 text-3xl font-black">{snapshot.totals.interviewsToday}</p>
          <p className="mt-1 text-xs text-slate-300">interview appointments</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div><p className="text-lg font-black">{snapshot.totals.onboardingActive}</p><p className="text-[10px] text-slate-400">Onboarding active</p></div>
            <div><p className="text-lg font-black">{snapshot.totals.documentsAttention}</p><p className="text-[10px] text-slate-400">Document flags</p></div>
          </div>
        </div>
      </div>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => <button key={card.label} type="button" title={'Open ' + card.label.toLowerCase() + ' workspace'} onClick={() => dispatch({ type: 'SET_VIEW', view: card.view })} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
        <div className="flex items-center justify-between"><div className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-600"><Icon name={card.icon} size={18} /></div><span className="text-2xl font-black text-slate-950">{card.value}</span></div>
        <p className="mt-4 text-xs font-bold text-slate-800">{card.label}</p><p className="mt-1 text-[11px] text-slate-400">{card.hint}</p>
      </button>)}
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="dashboard-pipeline-title">
        <div className="flex items-center justify-between"><div><h2 id="dashboard-pipeline-title" className="text-sm font-black text-slate-900">Candidate pipeline</h2><p className="mt-1 text-xs text-slate-500">Current distribution across recruitment stages.</p></div><button type="button" title="Open detailed recruitment reports" onClick={() => dispatch({ type: 'SET_VIEW', view: 'reports' })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900"><Icon name="arrow-right" size={17} /></button></div>
        <div className="mt-5 space-y-3">{snapshot.pipeline.map((item) => <div key={item.status}>
          <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 font-semibold text-slate-700"><Icon name={statusIcon[item.status]} size={14} />{item.label}</span><span className="font-black text-slate-900">{item.count}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: Math.max(item.percentage, item.count > 0 ? 4 : 0) + '%' }} /></div>
        </div>)}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="dashboard-action-title">
        <div className="flex items-center justify-between"><div><h2 id="dashboard-action-title" className="text-sm font-black text-slate-900">Action center</h2><p className="mt-1 text-xs text-slate-500">Operational work items ready for follow-up.</p></div><Icon name="alert" size={18} className="text-amber-600" /></div>
        <div className="mt-4 space-y-2">{snapshot.actions.map((action) => <button key={action.id} type="button" title={'Open ' + action.title.toLowerCase()} onClick={() => dispatch({ type: 'SET_VIEW', view: action.target })} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-left hover:bg-slate-50">
          <span className={'grid size-9 shrink-0 place-items-center rounded-xl ' + (action.count > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500')}><Icon name={action.count > 0 ? 'alert' : 'check'} size={16} /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{action.title}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{action.description}</span></span>
          <strong className="text-lg text-slate-900">{action.count}</strong>
        </button>)}</div>
      </section>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Onboarding & documents</h2><p className="mt-1 text-xs text-slate-500">Candidate readiness signals for recruiter follow-up.</p></div><button type="button" title="Open candidate onboarding workspace" onClick={() => dispatch({ type: 'SET_VIEW', view: 'candidates' })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><Icon name="arrow-right" size={17} /></button></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{snapshot.totals.onboardingActive}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Active onboarding</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{snapshot.totals.onboardingNeedsChanges}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Needs changes</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{snapshot.totals.documentsAttention}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Document flags</p></div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Selection capacity</h2><p className="mt-1 text-xs text-slate-500">Current selected candidates against all tracked openings.</p></div><button type="button" title="Open selection workspace" onClick={() => dispatch({ type: 'SET_VIEW', view: 'selection' })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><Icon name="arrow-right" size={17} /></button></div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{snapshot.selection.selected}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Selected</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{snapshot.selection.remaining}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Openings remaining</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{snapshot.selection.approvalsPending}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">Pending approvals</p></div>
        </div>
      </section>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Today's interview desk</h2><p className="mt-1 text-xs text-slate-500">Upcoming appointments and active evaluations.</p></div><button type="button" title="Open the full interview desk" onClick={() => dispatch({ type: 'SET_VIEW', view: 'interviews' })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><Icon name="arrow-right" size={17} /></button></div>
        {snapshot.todayInterviews.length === 0 ? <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-500">No interviews are scheduled for today.</div> : <div className="mt-4 divide-y divide-slate-100">{snapshot.todayInterviews.slice(0, 5).map((interview) => <div key={interview.id} className="flex items-center gap-3 py-3"><div className="w-14 text-xs font-black text-slate-900">{interview.time}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-800">{interview.candidateName}</p><p className="mt-0.5 text-[11px] text-slate-500">{interview.profession} · {interview.type} · {interview.location}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold capitalize text-slate-600">{interview.status.replace('-', ' ')}</span></div>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-black text-slate-900">Interview workload</h2><p className="mt-1 text-xs text-slate-500">Current volume by operational state.</p></div><button type="button" title="Open interview workload" onClick={() => dispatch({ type: 'SET_VIEW', view: 'interviews' })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><Icon name="arrow-right" size={17} /></button></div>
        <div className="mt-4 grid grid-cols-2 gap-3">{[
          ['Scheduled', snapshot.interviewLoad.scheduled],
          ['Evaluation', snapshot.interviewLoad.evaluation],
          ['Completed', snapshot.interviewLoad.completed],
          ['Needs decision', snapshot.interviewLoad.needsDecision],
        ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black text-slate-900">{value}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{label}</p></div>)}</div>
      </section>
    </div>

    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-900">Recently added candidates</h2><p className="mt-1 text-xs text-slate-500">Latest records entering the recruitment funnel.</p></div><button type="button" title="Open the candidate directory" onClick={() => dispatch({ type: 'SET_VIEW', view: 'candidates' })} className="text-xs font-bold text-cyan-700 hover:text-cyan-900">View directory</button></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{snapshot.recentCandidates.map((candidate) => <button key={candidate.id} type="button" title={'Open ' + candidate.name + ' in Candidates'} onClick={() => dispatch({ type: 'SET_VIEW', view: 'candidates' })} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-left hover:border-slate-200 hover:bg-white"><div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-bold text-slate-900">{candidate.name}</p><span className="rounded-full bg-white px-2 py-1 text-[9px] font-bold text-slate-500">{candidate.status}</span></div><p className="mt-1 truncate text-[11px] text-slate-500">{candidate.profession}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">{candidate.reference}</p></button>)}</div>
    </div>
  </section>;
};

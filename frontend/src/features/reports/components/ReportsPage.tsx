import { Icon } from '../../../shared/components/Icon';
import { useReportsWorkspace } from '../hooks/useReportsWorkspace';

interface BarListProps {
  title: string;
  description: string;
  items: Array<{ label: string; value: number; percentage: number }>;
}

const BarList = ({ title, description, items }: BarListProps) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div><h2 className="text-sm font-black text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>
    {items.length === 0 || items.every((item) => item.value === 0)
      ? <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-500">No data in this range.</div>
      : <div className="mt-5 space-y-3">{items.map((item) => <div key={item.label}>
        <div className="flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{item.label}</span><span className="font-black text-slate-900">{item.value} <span className="font-medium text-slate-400">({item.percentage}%)</span></span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-900" style={{ width: Math.max(item.percentage, item.value > 0 ? 4 : 0) + '%' }} /></div>
      </div>)}</div>}
  </section>
);

export const ReportsPage = () => {
  const { state, loading, hasError, actions } = useReportsWorkspace();

  if (loading) return <section className="mx-auto max-w-7xl p-4 sm:p-6"><div className="animate-pulse space-y-4"><div className="h-32 rounded-3xl bg-slate-200" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-2xl bg-slate-200" />)}</div><div className="grid gap-4 lg:grid-cols-2"><div className="h-72 rounded-2xl bg-slate-200" /><div className="h-72 rounded-2xl bg-slate-200" /></div></div></section>;

  if (hasError) return <section className="mx-auto max-w-3xl p-6"><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center"><Icon name="alert" size={28} className="mx-auto text-rose-600" /><h1 className="mt-4 text-xl font-black text-slate-950">Reports could not load</h1><p className="mt-2 text-sm text-slate-500">Refresh the recruitment workspaces and try again.</p></div></section>;

  const snapshot = state.snapshot;
  const cards = [
    { label: 'Candidates', value: snapshot.totalCandidates, hint: 'Candidate records in this report range' },
    { label: 'Interviews', value: snapshot.interviewed, hint: snapshot.interviewPassRate + '% moved to Select / Reserve' },
    { label: 'Selected', value: snapshot.selected, hint: 'Selected candidates in the filtered pool' },
    { label: 'Documents attention', value: snapshot.documentsAttention, hint: 'Profiles with unverified documents' },
  ];

  return <section className="mx-auto max-w-7xl p-4 sm:p-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Reports & analytics</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Understand the recruitment funnel and where work is accumulating.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Filter by reporting window and trade, then export the visible summary for operational follow-up.</p></div>
        <button type="button" title="Download the current report as CSV" onClick={actions.downloadCsv} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="download" size={16} />Export CSV</button>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
        <label className="min-w-0 flex-1"><span className="mb-1 block text-[11px] font-bold text-slate-500">Date range</span><select title="Filter report by date range" value={state.filters.range} onChange={(event) => actions.setRange(event.target.value as ReportRange)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All available data</option></select></label>
        <label className="min-w-0 flex-1"><span className="mb-1 block text-[11px] font-bold text-slate-500">Trade / profession</span><select title="Filter report by profession" value={state.filters.profession} onChange={(event) => actions.setProfession(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400">{state.professions.map((profession) => <option key={profession} value={profession}>{profession === 'all' ? 'All professions' : profession}</option>)}</select></label>
      </div>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.hint}</p></div>)}</div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <BarList title="Candidate source" description="Where the filtered candidate records entered the system." items={snapshot.sourceBreakdown} />
      <BarList title="Recruitment pipeline" description="Current candidate status distribution." items={snapshot.pipelineBreakdown} />
      <BarList title="Onboarding lifecycle" description="Candidate-facing onboarding state." items={snapshot.onboardingBreakdown} />
      <BarList title="Interview outcomes" description="Decision state across interviews in the filtered candidate pool." items={snapshot.interviewOutcomeBreakdown} />
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[.7fr_1.3fr]">
      <BarList title="Rejection reasons" description="Structured reasons recorded on rejected candidates." items={snapshot.rejectionBreakdown} />
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="profession-report-title">
        <div><h2 id="profession-report-title" className="text-sm font-black text-slate-900">Trade performance</h2><p className="mt-1 text-xs text-slate-500">Volume, interview activity, forward decisions and average recorded score.</p></div>
        {snapshot.professionBreakdown.length === 0
          ? <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-500">No profession data in this range.</div>
          : <div className="mt-4 overflow-x-auto"><table className="min-w-[680px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3 font-bold">Profession</th><th className="px-3 py-3 font-bold">Candidates</th><th className="px-3 py-3 font-bold">Interviews</th><th className="px-3 py-3 font-bold">Passed / forward</th><th className="px-3 py-3 font-bold">Selected</th><th className="px-3 py-3 font-bold">Avg score</th></tr></thead><tbody>{snapshot.professionBreakdown.map((row) => <tr key={row.profession} className="border-b border-slate-50 last:border-0"><td className="px-3 py-3 text-xs font-bold text-slate-800">{row.profession}</td><td className="px-3 py-3 text-xs text-slate-600">{row.candidates}</td><td className="px-3 py-3 text-xs text-slate-600">{row.interviewed}</td><td className="px-3 py-3 text-xs text-slate-600">{row.passed}</td><td className="px-3 py-3 text-xs text-slate-600">{row.selected}</td><td className="px-3 py-3 text-xs font-black text-slate-900">{row.averageScore > 0 ? row.averageScore + '%' : '—'}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </section>;
};

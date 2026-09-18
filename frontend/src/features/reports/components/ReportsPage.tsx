import { Icon } from '../../../shared/components/Icon';
import { useReportsWorkspace } from '../hooks/useReportsWorkspace';
import type { ReportRange } from '../types/reports';

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

  if (hasError) return <section className="mx-auto max-w-3xl p-6"><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center"><Icon name="alert" size={28} className="mx-auto text-rose-600" /><h1 className="mt-4 text-xl font-black text-slate-950">Reports could not load</h1><p className="mt-2 text-sm text-slate-500">Refresh the recruitment workspaces and try again.</p><button type="button" title="Retry report data loading" onClick={actions.retry} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="refresh" size={15} />Retry</button></div></section>;

  const snapshot = state.snapshot;
  const cards = [
    { label: 'Candidates', value: snapshot.totalCandidates, hint: 'Created within the selected report range' },
    { label: 'Interviews', value: snapshot.interviewed, hint: snapshot.interviewCoverage + '% interview coverage' },
    { label: 'Forward rate', value: snapshot.interviewPassRate + '%', hint: 'Interviews decided Select or Reserve' },
    { label: 'Onboarding', value: snapshot.onboardingCompletionRate + '%', hint: snapshot.onboardingCompleted + ' completed' },
  ];

  return <section className="mx-auto max-w-7xl p-4 sm:p-6">
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">Reports & analytics</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Understand recruitment flow, workload and candidate readiness.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Use the report window and trade filter to inspect operational data, then export the same snapshot for follow-up.</p></div>
        <button type="button" title="Download the current filtered report as CSV" onClick={actions.downloadCsv} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><Icon name="download" size={16} />Export CSV</button>
      </div>

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-600">{snapshot.scopeNote}</div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
        <label className="min-w-0 flex-1"><span className="mb-1 block text-[11px] font-bold text-slate-500">Date range</span><select title="Filter report by date range" value={state.filters.range} onChange={(event) => actions.setRange(event.target.value as ReportRange)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All available data</option></select></label>
        <label className="min-w-0 flex-1"><span className="mb-1 block text-[11px] font-bold text-slate-500">Trade / profession</span><select title="Filter report by profession" value={state.filters.profession} onChange={(event) => actions.setProfession(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-400">{state.professions.map((profession) => <option key={profession} value={profession}>{profession === 'all' ? 'All professions' : profession}</option>)}</select></label>
      </div>
      <p className="mt-3 text-[11px] font-semibold text-slate-400">{snapshot.rangeLabel} · {state.filters.profession === 'all' ? 'All professions' : state.filters.profession}</p>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.label}</p><p className="mt-2 text-3xl font-black text-slate-950">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.hint}</p></div>)}</div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <BarList title="Candidate source" description="How candidates entered the system in this reporting cohort." items={snapshot.sourceBreakdown} />
      <BarList title="Recruitment pipeline" description="Current status of candidates in the reporting cohort." items={snapshot.pipelineBreakdown} />
      <BarList title="Onboarding lifecycle" description="Current onboarding state of candidates in the reporting cohort." items={snapshot.onboardingBreakdown} />
      <BarList title="Interview outcomes" description="Interview decisions recorded inside the selected reporting window." items={snapshot.interviewOutcomeBreakdown} />
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[.7fr_1.3fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="readiness-report-title">
        <div><h2 id="readiness-report-title" className="text-sm font-black text-slate-900">Readiness snapshot</h2><p className="mt-1 text-xs text-slate-500">Current onboarding and document state for candidates in the report cohort.</p></div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-semibold text-slate-600">Documents verified</span><strong className="text-sm font-black text-slate-900">{snapshot.documentsReady} / {snapshot.totalCandidates}</strong></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-semibold text-slate-600">Documents needing attention</span><strong className="text-sm font-black text-slate-900">{snapshot.documentsAttention}</strong></div>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-semibold text-slate-600">Active onboarding</span><strong className="text-sm font-black text-slate-900">{snapshot.onboardingActive}</strong></div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="profession-report-title">
        <div><h2 id="profession-report-title" className="text-sm font-black text-slate-900">Trade performance</h2><p className="mt-1 text-xs text-slate-500">Candidate volume plus interviews and forward decisions recorded in the reporting window.</p></div>
        {snapshot.professionBreakdown.length === 0
          ? <div className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-xs text-slate-500">No profession data in this range.</div>
          : <div className="mt-4 overflow-x-auto"><table className="min-w-[720px] w-full text-left"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3 font-bold">Profession</th><th className="px-3 py-3 font-bold">Candidates</th><th className="px-3 py-3 font-bold">Interviews</th><th className="px-3 py-3 font-bold">Forward</th><th className="px-3 py-3 font-bold">Selected</th><th className="px-3 py-3 font-bold">Avg score</th></tr></thead><tbody>{snapshot.professionBreakdown.map((row) => <tr key={row.profession} className="border-b border-slate-50 last:border-0"><td className="px-3 py-3 text-xs font-bold text-slate-800">{row.profession}</td><td className="px-3 py-3 text-xs text-slate-600">{row.candidates}</td><td className="px-3 py-3 text-xs text-slate-600">{row.interviews}</td><td className="px-3 py-3 text-xs text-slate-600">{row.forwardDecisions}</td><td className="px-3 py-3 text-xs text-slate-600">{row.selected}</td><td className="px-3 py-3 text-xs font-black text-slate-900">{row.averageScore > 0 ? row.averageScore + '%' : '—'}</td></tr>)}</tbody></table></div>}
      </section>
    </div>

    <div className="mt-4">
      <BarList title="Rejection reasons" description="Structured rejection reasons recorded for candidates in the reporting cohort." items={snapshot.rejectionBreakdown} />
    </div>
  </section>;

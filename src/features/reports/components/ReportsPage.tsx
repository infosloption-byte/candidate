import { useCandidateWorkspace } from '../../candidates/hooks/useCandidateWorkspace';
import { Icon } from '../../../shared/components/Icon';

export const ReportsPage = () => {
  const { state } = useCandidateWorkspace();
  const rejected = state.candidates.filter((candidate) => candidate.status === 'rejected');
  const reasons = new Map<string, number>();
  rejected.forEach((candidate) => {
    const reason = candidate.rejectionReason?.split(':')[0] ?? 'Reason not recorded';
    reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  });
  const reasonRows = Array.from(reasons.entries()).sort((a, b) => b[1] - a[1]);

  return <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><section className="mx-auto max-w-6xl"><p className="text-sm font-semibold text-blue-600">Recruitment intelligence</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Reports</h1><p className="mt-2 text-sm text-slate-500">The MVP already keeps rejection reasons structured so reporting becomes useful instead of manual.</p><div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold text-slate-900">Pipeline snapshot</h2><p className="mt-1 text-xs text-slate-500">Current candidate counts</p></div><Icon name="chart" className="text-slate-400" /></div><div className="mt-5 grid grid-cols-2 gap-3">{['new', 'screening', 'interview', 'selected', 'reserve', 'rejected'].map((status) => <div key={status} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{state.candidates.filter((candidate) => candidate.status === status).length}</p><p className="mt-1 text-xs capitalize text-slate-500">{status}</p></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><div><h2 className="text-sm font-semibold text-slate-900">Why candidates are rejected</h2><p className="mt-1 text-xs text-slate-500">Structured reasons collected by the workflow.</p></div><div className="mt-5 space-y-3">{reasonRows.length ? reasonRows.map(([reason, count]) => <div key={reason} className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-3"><span className="text-sm text-rose-800">{reason}</span><span className="text-sm font-bold text-rose-700">{count}</span></div>) : <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">No rejection data yet.</div>}</div></section></div></section></main>;
};

import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { Button } from '../../shared/components/Button';
import { Icon } from '../../shared/components/Icon';
import { apiFetch } from '../../shared/lib/api';

interface PlatformAnalytics {
  counts: {
    companies: number;
    activeCompanies: number;
    inactiveCompanies: number;
    agencies: number;
    activeAgencies: number;
    inactiveAgencies: number;
    users: number;
    activeUsers: number;
    inactiveUsers: number;
    candidates: number;
    jobs: number;
    publishedJobs: number;
    interviews: number;
    submittedEvaluations: number;
    companyAdmins: number;
  };
  onboarding: {
    companiesCreatedLast7Days: number;
    companiesCreatedLast30Days: number;
    companiesWithoutAgencies: number;
    companiesWithoutJobs: number;
    companiesWithoutCandidates: number;
  };
  userRoles: Record<string, number>;
  recentCompanies: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    users: number;
    agencies: number;
    candidates: number;
    jobs: number;
    interviews: number;
  }>;
}

const downloadCsv = (rows: string[][]) => {
  const csv = rows.map((row) => row.map((value) => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'buildhire-platform-report.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

export const PlatformReportsPage = () => {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetch<PlatformAnalytics>('/platform/summary')
      .then((result) => { if (!cancelled) setData(result); })
      .catch((requestError: unknown) => { if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load platform reports.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return [
      ['Metric', 'Value'],
      ['Companies', String(data.counts.companies)],
      ['Active companies', String(data.counts.activeCompanies)],
      ['Agencies', String(data.counts.agencies)],
      ['Active agencies', String(data.counts.activeAgencies)],
      ['Users', String(data.counts.users)],
      ['Active users', String(data.counts.activeUsers)],
      ['Candidates', String(data.counts.candidates)],
      ['Jobs', String(data.counts.jobs)],
      ['Published jobs', String(data.counts.publishedJobs)],
      ['Interviews', String(data.counts.interviews)],
      ['Submitted evaluations', String(data.counts.submittedEvaluations)],
      [],
      ['Company onboarding', 'Value'],
      ['Companies created in last 7 days', String(data.onboarding.companiesCreatedLast7Days)],
      ['Companies created in last 30 days', String(data.onboarding.companiesCreatedLast30Days)],
      ['Companies without agencies', String(data.onboarding.companiesWithoutAgencies)],
      ['Companies without jobs', String(data.onboarding.companiesWithoutJobs)],
      ['Companies without candidates', String(data.onboarding.companiesWithoutCandidates)],
    ];
  }, [data]);

  if (loading) return <section className="mx-auto max-w-7xl p-4 sm:p-8"><StateMessage kind="loading" title="Loading platform reports" description="Preparing tenant, onboarding and platform activity statistics." /></section>;
  if (error || !data) return <section className="mx-auto max-w-7xl p-4 sm:p-8"><StateMessage kind="error" title="Platform reports unavailable" description={error || 'No platform report data was returned.'} /></section>;

  return (
    <section className="mx-auto max-w-7xl space-y-5 p-3 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600">Platform intelligence</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Platform reports</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Tenant growth, onboarding readiness and platform-wide operational reporting.</p>
        </div>
        <Button variant="secondary" onClick={() => downloadCsv(rows)}><Icon name="download" size={16} /> Export CSV</Button>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[
          ['Companies created · 7d', data.onboarding.companiesCreatedLast7Days],
          ['Companies created · 30d', data.onboarding.companiesCreatedLast30Days],
          ['Companies without jobs', data.onboarding.companiesWithoutJobs],
          ['Companies without candidates', data.onboarding.companiesWithoutCandidates],
        ].map(([label, value]) => (
          <Card key={String(label)}><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value}</p></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon name="briefcase" size={18} /></div><div><h2 className="text-base font-black text-slate-950">Tenant portfolio</h2><p className="text-xs text-slate-400">Core platform totals.</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              ['Companies', data.counts.companies],
              ['Agencies', data.counts.agencies],
              ['Users', data.counts.users],
              ['Candidates', data.counts.candidates],
              ['Jobs', data.counts.jobs],
              ['Interviews', data.counts.interviews],
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>)}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Icon name="users" size={18} /></div><div><h2 className="text-base font-black text-slate-950">Access distribution</h2><p className="text-xs text-slate-400">Platform account composition.</p></div></div>
          <div className="mt-4 space-y-2.5">
            {Object.entries(data.userRoles).map(([role, count]) => <div key={role} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3.5 py-3"><span className="text-xs font-bold text-slate-700">{role.replaceAll('_', ' ')}</span><span className="text-sm font-black text-slate-950">{count}</span></div>)}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Icon name="chart" size={18} /></div><div><h2 className="text-base font-black text-slate-950">Onboarding attention</h2><p className="text-xs text-slate-400">These are operational readiness signals, not a formal onboarding status field.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 p-3.5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No agencies</p><p className="mt-1 text-xl font-black">{data.onboarding.companiesWithoutAgencies}</p><p className="mt-1 text-[10px] text-slate-400">May still be setting up recruitment partners.</p></div>
          <div className="rounded-2xl border border-slate-100 p-3.5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No jobs</p><p className="mt-1 text-xl font-black">{data.onboarding.companiesWithoutJobs}</p><p className="mt-1 text-[10px] text-slate-400">May not have started hiring activity.</p></div>
          <div className="rounded-2xl border border-slate-100 p-3.5"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No candidates</p><p className="mt-1 text-xl font-black">{data.onboarding.companiesWithoutCandidates}</p><p className="mt-1 text-[10px] text-slate-400">May need onboarding support.</p></div>
        </div>
      </Card>
    </section>
  );
};

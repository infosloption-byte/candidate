import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useRecruitment } from '../../domain/recruitmentContext';
import { Card } from '../../shared/components/Card';
import { StateMessage } from '../../shared/components/StateMessage';
import { StatusPill } from '../../shared/components/StatusPill';
import { Icon, type IconName } from '../../shared/components/Icon';
import { apiFetch } from '../../shared/lib/api';
import type { UserRole } from '../../domain/types';

interface Props {
  role: UserRole;
}

interface PlatformCompany {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  users: number;
  agencies: number;
  candidates: number;
  jobs: number;
  interviews: number;
}

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
  recentCompanies: PlatformCompany[];
}

const toneClasses = {
  cyan: 'bg-cyan-50 text-cyan-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  violet: 'bg-violet-50 text-violet-700',
  slate: 'bg-slate-100 text-slate-700',
  rose: 'bg-rose-50 text-rose-700',
} as const;

type Tone = keyof typeof toneClasses;

const MetricCard = ({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: IconName;
  tone: Tone;
}) => (
  <Card className="min-w-0 overflow-hidden">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value.toLocaleString()}</p>
        <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">{hint}</p>
      </div>
      <div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${toneClasses[tone]}`}>
        <Icon name={icon} size={18} />
      </div>
    </div>
  </Card>
);

const roleLabel = (role: string): string => ({
  ADMIN: 'Platform admins',
  COMPANY_ADMIN: 'Company admins',
  AGENCY: 'Agency users',
  INTERVIEWER: 'Interviewers',
  INTERVIEWEE: 'Candidate portal users',
}[role] ?? role.replaceAll('_', ' '));

export const PlatformDashboardPage = ({ role }: Props) => {
  const { user, developmentMode } = useAuth();
  const { state } = useRecruitment();
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(!developmentMode);
  const [error, setError] = useState('');

  const developmentAnalytics = useMemo<PlatformAnalytics>(() => {
    const userRoles = Object.fromEntries(
      (['ADMIN', 'COMPANY_ADMIN', 'AGENCY', 'INTERVIEWER', 'INTERVIEWEE'] as const).map((nextRole) => [
        nextRole,
        state.users.filter((item) => item.role === nextRole).length,
      ]),
    );
    const activeCompanies = 1;
    return {
      counts: {
        companies: 1,
        activeCompanies,
        inactiveCompanies: 0,
        agencies: state.agencies.length,
        activeAgencies: state.agencies.filter((item) => item.status === 'ACTIVE').length,
        inactiveAgencies: state.agencies.filter((item) => item.status !== 'ACTIVE').length,
        users: state.users.length,
        activeUsers: state.users.filter((item) => item.active).length,
        inactiveUsers: state.users.filter((item) => !item.active).length,
        candidates: state.candidates.length,
        jobs: state.jobs.length,
        publishedJobs: state.jobs.filter((item) => item.status === 'PUBLISHED').length,
        interviews: state.interviews.length,
        submittedEvaluations: state.interviews.reduce(
          (count, item) => count + (item.evaluations?.filter((evaluation) => evaluation.status === 'SUBMITTED').length ?? 0),
          0,
        ),
        companyAdmins: state.users.filter((item) => item.role === 'COMPANY_ADMIN').length,
      },
      onboarding: {
        companiesCreatedLast7Days: 0,
        companiesCreatedLast30Days: 0,
        companiesWithoutAgencies: 0,
        companiesWithoutJobs: 0,
        companiesWithoutCandidates: 0,
      },
      userRoles,
      recentCompanies: [{
        id: 'company-1',
        name: 'BuildHire Demo Company',
        slug: 'buildhire-demo',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        users: state.users.filter((item) => item.companyId === 'company-1').length,
        agencies: state.agencies.filter((item) => item.companyId === 'company-1').length,
        candidates: state.candidates.filter((item) => item.companyId === 'company-1').length,
        jobs: state.jobs.filter((item) => item.companyId === 'company-1').length,
        interviews: state.interviews.filter((item) => item.companyId === 'company-1').length,
      }],
    };
  }, [state]);

  useEffect(() => {
    if (role !== 'ADMIN') return;

    if (developmentMode) {
      setAnalytics(developmentAnalytics);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    apiFetch<PlatformAnalytics>('/platform/summary')
      .then((result) => {
        if (!cancelled) setAnalytics(result);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load platform analytics.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [developmentAnalytics, developmentMode, role]);

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <StateMessage kind="loading" title="Loading platform dashboard" description="Preparing SaaS platform statistics." />
      </section>
    );
  }

  if (error || !analytics) {
    return (
      <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <StateMessage kind="error" title="Platform dashboard unavailable" description={error || 'No platform analytics data was returned.'} />
      </section>
    );
  }

  const { counts, userRoles, recentCompanies } = analytics;
  const tenantActivityRate = counts.companies ? Math.round((counts.activeCompanies / counts.companies) * 100) : 0;
  const userActivityRate = counts.users ? Math.round((counts.activeUsers / counts.users) * 100) : 0;
  const publishedJobRate = counts.jobs ? Math.round((counts.publishedJobs / counts.jobs) * 100) : 0;

  return (
    <section className="mx-auto max-w-7xl space-y-4 p-3 sm:space-y-5 sm:p-5 lg:space-y-6 lg:p-8">
      <div className="overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-xl">
        <div className="grid gap-6 p-5 text-white sm:p-7 lg:grid-cols-[1.25fr_.75fr] lg:items-end lg:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">Platform owner</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-300">SaaS operations</span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
              {user?.name ? `Welcome, ${user.name}` : 'Platform dashboard'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Monitor companies, agencies, users and recruitment activity across the entire BuildHire platform.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">SaaS readiness</p>
            <p className="mt-2 text-sm font-black text-white">Core platform analytics are active</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Support and billing modules can be connected here later without mixing them into company dashboards.
            </p>
          </div>
        </div>
      </div>


      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon name="briefcase" size={18} /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Company onboarding</p><h2 className="mt-1 text-base font-black text-slate-950">Tenant growth</h2></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">New · 7 days</p><p className="mt-1 text-xl font-black">{analytics.onboarding.companiesCreatedLast7Days}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">New · 30 days</p><p className="mt-1 text-xl font-black">{analytics.onboarding.companiesCreatedLast30Days}</p></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Icon name="alert" size={18} /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Onboarding attention</p><h2 className="mt-1 text-base font-black text-slate-950">Setup signals</h2></div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-xs font-bold text-slate-600">No agencies</span><span className="font-black">{analytics.onboarding.companiesWithoutAgencies}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-xs font-bold text-slate-600">No jobs</span><span className="font-black">{analytics.onboarding.companiesWithoutJobs}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-xs font-bold text-slate-600">No candidates</span><span className="font-black">{analytics.onboarding.companiesWithoutCandidates}</span></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Icon name="users" size={18} /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tenant administration</p><h2 className="mt-1 text-base font-black text-slate-950">Company admins</h2></div>
          </div>
          <p className="mt-4 text-3xl font-black text-slate-950">{counts.companyAdmins}</p>
          <p className="mt-1 text-xs text-slate-400">Company administrator accounts across the platform.</p>
        </Card>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Companies" value={counts.companies} hint={counts.activeCompanies + ' active tenants'} icon="briefcase" tone="cyan" />
        <MetricCard label="Agencies" value={counts.agencies} hint={counts.activeAgencies + ' active agencies'} icon="users" tone="emerald" />
        <MetricCard label="Users" value={counts.users} hint={counts.activeUsers + ' active accounts'} icon="users" tone="violet" />
        <MetricCard label="Candidates" value={counts.candidates} hint="across all companies" icon="target" tone="amber" />
        <MetricCard label="Jobs" value={counts.jobs} hint={counts.publishedJobs + ' currently published'} icon="briefcase" tone="slate" />
        <MetricCard label="Interviews" value={counts.interviews} hint="across all tenants" icon="calendar" tone="cyan" />
        <MetricCard label="Submitted evaluations" value={counts.submittedEvaluations} hint="completed interviewer submissions" icon="check" tone="emerald" />
        <MetricCard label="Inactive accounts" value={counts.inactiveUsers} hint="users currently disabled" icon="lock" tone="rose" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tenant overview</p>
              <h2 className="mt-1 text-base font-black text-slate-950 sm:text-lg">Recent companies</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">{recentCompanies.length} shown</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {recentCompanies.length ? recentCompanies.map((company) => (
              <div key={company.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-slate-900">{company.name}</p>
                      <StatusPill value={company.status} />
                    </div>
                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">{company.slug}</p>
                  </div>
                  <p className="shrink-0 text-[10px] font-semibold text-slate-400">
                    Created {new Date(company.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    ['Users', company.users],
                    ['Agencies', company.agencies],
                    ['Candidates', company.candidates],
                    ['Jobs', company.jobs],
                    ['Interviews', company.interviews],
                  ].map(([label, value]) => (
                    <div key={label as string} className="rounded-xl bg-white px-2.5 py-2">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">
                No companies have been created yet.
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Platform users</p>
                <h2 className="mt-1 text-base font-black text-slate-950">Role distribution</h2>
              </div>
              <Icon name="users" size={18} />
            </div>
            <div className="mt-4 space-y-2.5">
              {Object.entries(userRoles).map(([nextRole, count]) => (
                <div key={nextRole} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="min-w-0 truncate text-xs font-bold text-slate-700">{roleLabel(nextRole)}</span>
                  <span className="text-sm font-black text-slate-950">{count}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Operational health</p>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="text-slate-600">Active companies</span>
                  <span className="text-slate-950">{tenantActivityRate}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: tenantActivityRate + '%' }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="text-slate-600">Active users</span>
                  <span className="text-slate-950">{userActivityRate}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: userActivityRate + '%' }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="text-slate-600">Published jobs</span>
                  <span className="text-slate-950">{publishedJobRate}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: publishedJobRate + '%' }} /></div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon name="settings" size={18} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Support operations</p>
              <h2 className="mt-1 text-base font-black text-slate-950">Support center</h2>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">Reserved for tenant support, incidents, service requests and platform communications.</p>
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Module not connected yet</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon name="chart" size={18} /></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Billing operations</p>
              <h2 className="mt-1 text-base font-black text-slate-950">Subscriptions & payments</h2>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">Reserved for plans, subscriptions, invoices, payment health and recurring revenue analytics.</p>
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500">Module not connected yet</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};

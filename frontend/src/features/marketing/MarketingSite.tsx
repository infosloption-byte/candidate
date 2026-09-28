import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

type MarketingPage = 'home' | 'features' | 'security';

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const Icon = ({ children }: { children: React.ReactNode }) => (
  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
    {children}
  </span>
);

const Arrow = () => (
  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M4 10h11M10 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MarketingSite = () => {
  const { language, setLanguage, t } = useLanguage();
  const [path, setPath] = useState<MarketingPage>(() => {
    const current = window.location.pathname;
    return current === '/features' ? 'features' : current === '/security' ? 'security' : 'home';
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onPopState = () => {
      const current = window.location.pathname;
      setPath(current === '/features' ? 'features' : current === '/security' ? 'security' : 'home');
      setMenuOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navItems = useMemo(() => [
    { label: t('Product'), path: '/features' },
    { label: t('Security'), path: '/security' },
    { label: t('How it works'), path: '/#workflow' },
  ], [t]);

  const go = (target: string) => {
    if (target.startsWith('/#')) {
      const section = target.slice(2);
      if (path !== 'home') {
        navigate('/');
        window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' }), 50);
      } else {
        document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    navigate(target);
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#f7fafc] text-slate-950 selection:bg-cyan-100 selection:text-cyan-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" className="flex items-center gap-3" onClick={() => go('/')}>
            <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-cyan-300 shadow-sm">B</span>
            <span className="text-lg font-black tracking-tight">BuildHire</span>
          </button>

          <nav className="hidden items-center gap-7 md:flex">
            {navItems.map((item) => (
              <button key={item.label} type="button" onClick={() => go(item.path)} className="text-sm font-semibold text-slate-500 transition hover:text-slate-950">
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <select
              aria-label={t('Language')}
              value={language}
              onChange={(event) => setLanguage(event.target.value as 'en' | 'he')}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none"
            >
              <option value="en">English</option>
              <option value="he">עברית</option>
            </select>
            <button type="button" onClick={() => navigate('/login')} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">
              {t('Sign in')}
            </button>
            <button type="button" onClick={() => navigate('/login?mode=company-register')} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800">
              {t('Start free')}
            </button>
          </div>

          <button type="button" className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={t('Open navigation')}>
            {menuOpen ? '×' : '☰'}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              {navItems.map((item) => (
                <button key={item.label} type="button" onClick={() => { setMenuOpen(false); go(item.path); }} className="rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                  {item.label}
                </button>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => navigate('/login')} className="rounded-xl border border-slate-200 py-3 text-sm font-bold">{t('Sign in')}</button>
                <button type="button" onClick={() => navigate('/login?mode=company-register')} className="rounded-xl bg-slate-950 py-3 text-sm font-bold text-white">{t('Start free')}</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {path === 'home' ? <HomePage t={t} go={go} /> : path === 'features' ? <FeaturesPage t={t} go={go} /> : <SecurityPage t={t} go={go} />}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-xs font-black text-cyan-300">B</span>
              <span className="font-black">BuildHire</span>
            </div>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{t('A connected recruitment workspace for companies, agencies, interviewers, and candidates.')}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-500">
            <button type="button" onClick={() => go('/')}>{t('Home')}</button>
            <button type="button" onClick={() => go('/features')}>{t('Product')}</button>
            <button type="button" onClick={() => go('/security')}>{t('Security')}</button>
            <button type="button" onClick={() => navigate('/login')}>{t('Sign in')}</button>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-slate-400 sm:px-6 lg:px-8">© {new Date().getFullYear()} BuildHire. {t('Recruitment operations, connected.')}</div>
        </div>
      </footer>
    </div>
  );
};

type MarketingCopyProps = {
  t: (value: string) => string;
  go: (path: string) => void;
};

const HomePage = ({ t, go }: MarketingCopyProps) => (
  <>
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_38%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/85 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-700 shadow-sm">
              <span className="size-1.5 rounded-full bg-cyan-500" />
              {t('Recruitment operations, connected')}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-7xl">
              {t('Move every candidate from intake to decision with one clear workflow.')}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              {t('BuildHire connects company teams, manpower agencies, interviewers, and candidates in a shared recruitment workspace built for high-volume hiring.')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => navigate('/login?mode=company-register')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800">
                {t('Create your workspace')} <Arrow />
              </button>
              <button type="button" onClick={() => go('/features')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
                {t('Explore the platform')}
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
              <span>✓ {t('Candidate pool')}</span>
              <span>✓ {t('Interview panels')}</span>
              <span>✓ {t('Reusable criteria')}</span>
              <span>✓ {t('Company + agency workspaces')}</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-cyan-200/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-35px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{t('Operations command center')}</p>
                    <p className="mt-1 text-sm font-black">{t('Today at a glance')}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-300">BuildHire</span>
                </div>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {[
                  [t('Open roles'), '24', t('active')],
                  [t('Candidates'), '1,284', t('in pool')],
                  [t('Interviews'), '86', t('scheduled')],
                  [t('Decisions'), '31', t('awaiting review')],
                ].map(([label, value, meta]) => (
                  <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <p className="text-2xl font-black text-slate-950">{value}</p>
                      <span className="text-[10px] font-bold text-cyan-700">{meta}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-900">{t('Hiring pipeline')}</p>
                  <span className="text-[10px] font-bold text-slate-400">{t('This week')}</span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[
                    [t('Pool'), '78%'],
                    [t('Ready'), '61%'],
                    [t('Interviewed'), '42%'],
                    [t('Hired'), '24%'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400"><span>{label}</span><span>{value}</span></div>
                      <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: value }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-xs font-black text-slate-900">{t('Next interview')}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Ahmed Al Mansoori · Electrician · 10:30</p>
                </div>
                <span className="rounded-xl bg-cyan-50 px-3 py-2 text-center text-[10px] font-black text-cyan-700">{t('Ready')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            [t('For company teams'), t('Own jobs, candidate pools, interviews, decisions, and reporting.')],
            [t('For agencies'), t('Manage candidate intake and recruitment activity in the right workspace.')],
            [t('For interviewers'), t('See assigned interviews, score criteria, and submit evaluations quickly.')],
            [t('For candidates'), t('Keep one profile throughout the recruitment journey and see assigned interviews.')],
          ].map(([title, description]) => (
            <div key={title} className="border-l border-slate-200 pl-4 first:border-l-0 first:pl-0">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">{title}</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">{t('One operating system')}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">{t('From candidate intake to final decision, every handoff has a place.')}</h2>
          <p className="mt-5 text-base leading-7 text-slate-600">{t('Replace spreadsheets, disconnected interview notes, and scattered candidate updates with one system of record.')}</p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            ['01', t('Capture'), t('Import or create candidates once, keep their recruitment history, and build job-specific pools.')],
            ['02', t('Coordinate'), t('Create openings, assign candidates, schedule panels, and give interviewers a focused queue.')],
            ['03', t('Evaluate'), t('Use reusable criteria groups, point limits, structured responses, and multiple-tag answers.')],
            ['04', t('Decide'), t('Compare interviewer submissions, update final candidate status, and keep the decision trail visible.')],
          ].map(([number, title, description]) => (
            <div key={number} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-sm font-black text-cyan-600">{number}</span>
              <h3 className="mt-8 text-lg font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">{t('Built for operational hiring')}</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">{t('One platform. Different teams. One shared source of truth.')}</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{t('BuildHire keeps each role focused while the company retains visibility across the full recruitment workflow.')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [t('Company administration'), t('Manage jobs, agencies, users, interview criteria, candidates, interviews, and operational reporting.')],
              [t('Agency operations'), t('Work inside your agency workspace, manage candidate records, and support recruitment activity.')],
              [t('Interview operations'), t('Open assigned interviews, capture structured scores, notes, and outcomes without hunting through spreadsheets.')],
              [t('Candidate experience'), t('Use one profile through the recruitment history and access assigned interview information from the portal.')],
            ].map(([title, description]) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-5 rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-slate-50 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">{t('Ready to bring the workflow together?')}</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">{t('Create a company workspace and make your next hiring cycle easier to run.')}</h2>
          </div>
          <button type="button" onClick={() => navigate('/login?mode=company-register')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg shadow-slate-900/10">
            {t('Create company workspace')} <Arrow />
          </button>
        </div>
      </section>
    </main>
  </>
);

const FeaturesPage = ({ t, go }: MarketingCopyProps) => (
  <main>
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
      <div className="max-w-3xl">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">{t('Platform')}</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">{t('Everything your recruitment team needs to run the workflow, not just track it.')}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">{t('The platform is organized around the real operating steps of recruitment: jobs, candidates, interviews, criteria, decisions, and the teams responsible for each stage.')}</p>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['candidates', t('Candidate operations'), t('Import candidate pools, capture intake fields, keep one recruitment history, filter by job and status, and open full candidate profiles.')],
          ['jobs', t('Job management'), t('Create openings, define required roles and capacity, track filled positions, and work from job-specific candidate pools.')],
          ['interviews', t('Interview workflow'), t('Schedule interview panels, assign interviewers, start assigned interviews, capture notes, and manage no-show or cancellation outcomes.')],
          ['criteria', t('Structured scorecards'), t('Create reusable criteria and groups, support point limits and multiple-tag answers, and preserve older scorecards when criteria are disabled.')],
          ['team', t('Role-based workspaces'), t('Give company administrators, agencies, interviewers, and candidates the right operational surface without mixing responsibilities.')],
          ['reports', t('Operational visibility'), t('Use dashboards and reports to understand recruitment movement, interview workload, completion, and candidate decisions.')],
        ].map(([key, title, description]) => (
          <article key={key} className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 sm:p-7">
            <Icon>
              {key === 'candidates' ? '01' : key === 'jobs' ? '02' : key === 'interviews' ? '03' : key === 'criteria' ? '04' : key === 'team' ? '05' : '06'}
            </Icon>
            <h2 className="mt-6 text-xl font-black">{title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">{description}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          {[
            [t('Connected candidate records'), t('Candidate information stays connected to agencies, jobs, interviews, and status history rather than living in separate files.')],
            [t('Structured decisions'), t('Interview scoring and final status work from the same candidate record so teams can move from evaluation to decision with less re-entry.')],
            [t('Designed for scale'), t('Use filters, pagination, role-based views, reusable criteria, and dedicated workspaces as the operation grows.')],
          ].map(([title, description]) => (
            <div key={title}>
              <div className="size-2 rounded-full bg-cyan-400" />
              <h3 className="mt-5 text-lg font-black">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">{t('See it in action')}</p>
            <h2 className="mt-3 text-3xl font-black">{t('Start with a company workspace.')}</h2>
          </div>
          <button type="button" onClick={() => navigate('/login?mode=company-register')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white">
            {t('Start free')} <Arrow />
          </button>
        </div>
      </div>
    </section>

    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
      <button type="button" onClick={() => go('/')} className="text-sm font-bold text-slate-500 hover:text-slate-950">← {t('Back to home')}</button>
    </div>
  </main>
);

const SecurityPage = ({ t }: MarketingCopyProps) => (
  <main>
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 lg:px-8 lg:pt-24">
      <div className="max-w-3xl">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-700">{t('Security')}</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-6xl">{t('Keep access, responsibilities, and recruitment records clearly separated.')}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">{t('BuildHire is organized around role-based access, company workspaces, agency relationships, interview assignments, and audit-ready recruitment history.')}</p>
      </div>
    </section>

    <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-24 sm:px-6 md:grid-cols-2 lg:px-8">
      {[
        [t('Role-based access'), t('Platform administrators, company administrators, agencies, interviewers, and candidates operate through separate role-aware surfaces.')],
        [t('Workspace boundaries'), t('Companies own their recruitment data while agency relationships are maintained explicitly through the workspace model.')],
        [t('Session controls'), t('Account settings include password changes and the ability to sign out all active sessions.')],
        [t('Recruitment history'), t('Candidate records, interviews, evaluations, and status changes stay connected so teams can understand what happened and what happens next.')],
        [t('Structured evaluation'), t('Reusable criteria and scorecards provide a consistent place for interview responses, points, and interviewer submissions.')],
        [t('Operational transparency'), t('Dashboards, activity views, and reporting surfaces are designed to make operational state visible to authorized users.')],
      ].map(([title, description]) => (
        <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-5 grid size-10 place-items-center rounded-2xl bg-cyan-50 text-sm font-black text-cyan-700">✓</div>
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        </article>
      ))}
    </section>

    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{t('A practical security model')}</p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">{t('Good operational security starts with good boundaries.')}</h2>
          <p className="mt-5 text-base leading-7 text-slate-600">{t('BuildHire focuses on clear account roles, explicit workspace relationships, scoped operational views, and connected history instead of treating security as a separate screen.')}</p>
        </div>
      </div>
    </section>
  </main>
);

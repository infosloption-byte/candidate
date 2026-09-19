import { useState } from 'react';
import { AppShell, type AppView } from './components/AppShell';

const titles: Record<AppView, string> = {
  dashboard: 'Dashboard',
  jobs: 'Jobs',
  candidates: 'Candidates',
  applications: 'Applications',
  interviews: 'Interviews',
  agencies: 'Agencies & Users',
  settings: 'Settings',
};

const descriptions: Record<AppView, string> = {
  dashboard: 'A clean starting point for the rebuilt recruitment workspace.',
  jobs: 'Publish and manage agency job advertisements.',
  candidates: 'Manage candidates from self-onboarding or agency onboarding.',
  applications: 'Track candidate applications against published jobs.',
  interviews: 'Schedule interviews and assign interviewer panels.',
  agencies: 'Manage agencies, agency users, and interviewer access.',
  settings: 'Workspace configuration for the rebuilt platform.',
};

export const App = () => {
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView}>
      <section className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-600">BuildHire foundation</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{titles[activeView]}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{descriptions[activeView]}</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {['Theme preserved', 'Business logic removed', 'Ready for rebuild'].map((label, index) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid size-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">{index + 1}</div>
                <p className="mt-4 text-sm font-bold text-slate-900">{label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">The visual shell remains while the product modules are rebuilt around the new scope.</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
};

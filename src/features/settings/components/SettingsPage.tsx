import { Icon } from '../../../shared/components/Icon';

const settings = [
  { title: 'Professions & skills', description: 'Manage construction trades and secondary skill tags.', icon: 'briefcase-business' as const },
  { title: 'Interview scorecards', description: 'Create the weighted criteria that interviewers use.', icon: 'layers' as const },
  { title: 'Interviewers', description: 'Maintain interviewer profiles and specialties.', icon: 'users' as const },
  { title: 'Users & permissions', description: 'Control what HR, interviewers and managers can access.', icon: 'shield' as const },
];

export const SettingsPage = () => <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><section className="mx-auto max-w-4xl"><p className="text-sm font-semibold text-blue-600">Workspace setup</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Settings</h1><p className="mt-2 text-sm text-slate-500">These are the administration areas we will connect to the real backend after the UX is proven.</p><div className="mt-6 grid gap-3">{settings.map((setting) => <button key={setting.title} type="button" className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-slate-300 hover:shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon name={setting.icon} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{setting.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{setting.description}</span></span><Icon name="chevron-right" size={18} className="text-slate-300" /></button>)}</div></section></main>;

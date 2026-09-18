import { Icon } from '../../shared/components/Icon';

interface AccessDeniedPageProps {
  roleLabel: string;
}

export const AccessDeniedPage = ({ roleLabel }: AccessDeniedPageProps) => (
  <section className="grid min-h-[65dvh] place-items-center p-6">
    <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Icon name="alert" size={22} /></div>
      <h1 className="mt-4 text-xl font-black text-slate-950">This workspace is not available to {roleLabel}.</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">Use the navigation options available to your current role, or sign out and choose another account.</p>
    </div>
  </section>
);

import type { Candidate } from '../../domain/types';
import { StatusPill } from '../../shared/components/StatusPill';

interface Props {
  candidate: Candidate | null;
  minimized: boolean;
  maximized: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
}

const value = (item: string | number | null | undefined, fallback = 'Not provided') =>
  item === null || item === undefined || item === '' ? fallback : String(item);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    <div className="mt-2 break-words text-sm font-semibold text-slate-900">{children}</div>
  </div>
);

export const CandidateProfilePanel = ({ candidate, minimized, maximized, onMinimize, onMaximize, onClose }: Props) => {
  if (!candidate) return null;

  const frameClass = maximized
    ? 'fixed inset-3 sm:inset-5'
    : minimized
      ? 'fixed bottom-4 right-4 w-[min(390px,calc(100vw-2rem))]'
      : 'fixed bottom-4 right-4 w-[min(760px,calc(100vw-2rem))]';

  if (minimized) {
    return (
      <div className="pointer-events-none fixed inset-0 z-[70]">
        <div className={frameClass + ' pointer-events-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'}>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black text-slate-950">{candidate.name}</p>
              <p className="truncate text-[10px] text-slate-400">{candidate.reference} · Passport: {value(candidate.passportNumber)}</p>
            </div>
            <button type="button" className="rounded-lg px-2 py-1.5 text-[10px] font-black text-slate-600 hover:bg-slate-100" onClick={onMaximize}>Open</button>
            <button type="button" aria-label="Close candidate profile" className="rounded-lg px-2 py-1 text-lg font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>×</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <div className={frameClass + ' pointer-events-auto flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-4rem)]'}>
        <header className="shrink-0 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-700">Candidate full profile</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-black text-slate-950 sm:text-lg">{candidate.name}</h2>
                <StatusPill value={candidate.status} />
                <StatusPill value={candidate.onboardingStatus} />
              </div>
              <p className="mt-1 break-words text-xs text-slate-500">{candidate.reference} · {candidate.profession ?? 'Profession not set'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Minimize candidate profile" title="Minimize" className="rounded-lg px-2 py-1.5 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onMinimize}>−</button>
              <button type="button" aria-label={maximized ? 'Restore candidate profile' : 'Maximize candidate profile'} title={maximized ? 'Restore' : 'Maximize'} className="rounded-lg px-2 py-1.5 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onMaximize}>{maximized ? '❐' : '□'}</button>
              <button type="button" aria-label="Close candidate profile" title="Close" className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onClose}>×</button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Passport number">
              <span className="text-cyan-700">{value(candidate.passportNumber)}</span>
            </Field>
            <Field label="Passport expiry">{candidate.passportExpiry ? new Date(candidate.passportExpiry).toLocaleDateString() : 'Not provided'}</Field>
            <Field label="Reference">{candidate.reference}</Field>
            <Field label="Country / nationality">{value(candidate.country)}</Field>
            <Field label="Current location">{value(candidate.currentLocation)}</Field>
            <Field label="Visa / work status">{value(candidate.visaStatus)}</Field>
            <Field label="Availability">{value(candidate.availability)}</Field>
            <Field label="Profession">{value(candidate.profession)}</Field>
            <Field label="Experience">{candidate.experienceYears === null ? 'Not provided' : candidate.experienceYears + ' years'}</Field>
            <Field label="Email">{value(candidate.email)}</Field>
            <Field label="Contact number">{value(candidate.phone)}</Field>
            <Field label="Alternate contact">{value(candidate.alternatePhone)}</Field>
            <Field label="Onboarding"><StatusPill value={candidate.onboardingStatus} /></Field>
            <Field label="Candidate source"><StatusPill value={candidate.source} /></Field>
            <Field label="Status"><StatusPill value={candidate.status} /></Field>
            <Field label="Status updated">{new Date(candidate.statusUpdatedAt).toLocaleString()}</Field>
          </div>

          <section className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">Skills</h3>
                <p className="mt-1 text-[10px] text-slate-400">{candidate.skills.length} skill(s) recorded</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.skills.length
                ? candidate.skills.map((skill) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">{skill}</span>)
                : <span className="text-xs text-slate-400">No skills recorded.</span>}
            </div>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Candidate ID</p>
              <p className="mt-2 break-all text-xs font-mono font-semibold text-slate-700">{candidate.id}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Agency ID</p>
              <p className="mt-2 break-all text-xs font-mono font-semibold text-slate-700">{candidate.agencyId}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

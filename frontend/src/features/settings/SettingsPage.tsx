import { SectionHeading } from '../../shared/components/SectionHeading';

export const SettingsPage = () => (
  <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <SectionHeading eyebrow="Platform foundation" title="Settings" description="Configuration stays intentionally small until the rebuilt core workflow proves what needs to be configurable." />
    <div className="grid gap-4 md:grid-cols-2">{[
      ['Roles', 'Admin, Agency, Interviewer, Interviewee'],
      ['Onboarding', 'Self onboarding, agency onboarding, and bulk onboarding'],
      ['Candidate lifecycle', 'Pool, Ready for interview, Interview scheduled, Interview completed, Passed, Rejected, On hold, Hired, Inactive'],
      ['Interviews', 'One interviewer or multiple interviewers as a panel'],
    ].map(([title, value]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">{title}</p><p className="mt-2 text-sm font-bold leading-6 text-slate-900">{value}</p></div>)}</div>
  </section>
);

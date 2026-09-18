import { usePermissions } from '../../auth/hooks/usePermissions';
import type { Candidate } from '../types/candidate';
import type { CandidateOperationalProfileController, CandidateOperationalProfileDraft } from '../hooks/useCandidateOperationalProfile';

interface CandidateOperationalProfilePanelProps {
  candidate: Candidate;
  controller: CandidateOperationalProfileController;
}

export const CandidateOperationalProfilePanel = ({ candidate, controller }: CandidateOperationalProfilePanelProps) => {
  const { can } = usePermissions();
  const editable = can('candidate.manage');

  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-sm font-black text-slate-900">Operational profile</h2><p className="mt-1 text-xs text-slate-500">Deployment-ready details used for allocation, document follow-up and recruiter handoff.</p></div>
      {editable && <button type="button" onClick={controller.actions.open} title="Edit operational candidate details" className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700">Edit details</button>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        ['Nationality', candidate.nationality || 'Not provided'],
        ['Date of birth', candidate.dateOfBirth || 'Not provided'],
        ['Passport expiry', candidate.passportExpiry || 'Not provided'],
        ['Visa / permit', candidate.visaStatus || 'Not started'],
        ['Destinations', candidate.preferredDestinationCountries?.join(', ') || 'Not provided'],
        ['Expected salary', candidate.expectedSalary ? (candidate.salaryCurrency || 'USD') + ' ' + candidate.expectedSalary : 'Not provided'],
        ['Notice period', candidate.noticePeriod || 'Not provided'],
        ['Years current trade', String(candidate.yearsInCurrentTrade ?? candidate.experienceYears)],
        ['Trade certificate', candidate.tradeCertificateDetails || 'Not provided'],
        ['Licence categories', candidate.drivingLicenseCategories?.join(', ') || 'None recorded'],
        ['Interview language', candidate.preferredInterviewLanguage || 'Not provided'],
        ['Emergency contact', candidate.emergencyContact ? candidate.emergencyContact.name + ' · ' + candidate.emergencyContact.phone : 'Not provided'],
        ['Recruiter owner', candidate.recruiterOwnerName || 'Unassigned'],
        ['Priority', candidate.priority || 'normal'],
        ['Source campaign', candidate.sourceCampaign || 'Not provided'],
      ].map(([label,value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-slate-800">{value}</p></div>)}
    </div>
    {controller.open && editable && <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
      <h3 className="text-sm font-black text-slate-900">Edit operational details</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {([
          ['nationality','Nationality','text'],['dateOfBirth','Date of birth','date'],['passportExpiry','Passport expiry','date'],
          ['expectedSalary','Expected salary','text'],['salaryCurrency','Salary currency','text'],['noticePeriod','Notice period','text'],
          ['yearsInCurrentTrade','Years in current trade','number'],['preferredInterviewLanguage','Preferred interview language','text'],
          ['emergencyName','Emergency contact name','text'],['emergencyPhone','Emergency contact phone','tel'],
          ['emergencyRelationship','Emergency relationship','text'],['recruiterOwnerName','Recruiter owner','text'],
          ['sourceCampaign','Source campaign / referral','text']
        ] as const satisfies ReadonlyArray<[keyof CandidateOperationalProfileDraft, string, 'text' | 'date' | 'number' | 'tel']>).map(([key,label,type]) => <label key={key} className="field-label">{label}<input value={controller.draft[key]} onChange={(event) => controller.actions.update(key, event.target.value as CandidateOperationalProfileDraft[typeof key])} type={type} className="field-input"/></label>)}
        <label className="field-label">Visa / work-permit status<select value={controller.draft.visaStatus} onChange={(event) => controller.actions.update('visaStatus', event.target.value as typeof controller.draft.visaStatus)} className="field-input"><option>Not started</option><option>Pending</option><option>Approved</option><option>Expired</option><option>Not required</option></select></label>
        <label className="field-label">Preferred destination countries<input value={controller.draft.preferredDestinationCountries} onChange={(event) => controller.actions.update('preferredDestinationCountries', event.target.value)} className="field-input" placeholder="UAE, Qatar, Oman"/></label>
        <label className="field-label sm:col-span-2">Trade certificate details<textarea value={controller.draft.tradeCertificateDetails} onChange={(event) => controller.actions.update('tradeCertificateDetails', event.target.value)} className="field-input min-h-20"/></label>
        <label className="field-label">Driving licence categories<input value={controller.draft.drivingLicenseCategories} onChange={(event) => controller.actions.update('drivingLicenseCategories', event.target.value)} className="field-input" placeholder="B, C1"/></label>
        <label className="field-label">Priority<select value={controller.draft.priority} onChange={(event) => controller.actions.update('priority', event.target.value as typeof controller.draft.priority)} className="field-input"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
      </div>
      <div className="mt-4 flex justify-end gap-2 border-t border-cyan-100 pt-3"><button type="button" onClick={controller.actions.close} title="Cancel operational profile editing" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="button" onClick={controller.actions.save} title="Save operational candidate details" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Save details</button></div>
    </div>}
  </section>;
};

import { Icon } from '../../../shared/components/Icon';
import { useAppContext } from '../../../app/hooks/useAppContext';
import { useSettingsWorkspace } from '../hooks/useSettingsWorkspace';
import { usePermissions } from '../../auth/hooks/usePermissions';

const tabs = [
  ['recruitment', 'Professions & skills'],
  ['interviews', 'Interview templates'],
  ['users', 'Users & permissions'],
  ['accessibility', 'Accessibility QA'],
] as const;

export const SettingsPage = () => {
  const { dispatch } = useAppContext();
  const { state, tab, inputs, activeProfessions, actions } = useSettingsWorkspace();
  const { can } = usePermissions();
  if (!can('settings.manage')) return <section className="mx-auto max-w-3xl p-6"><div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center"><h1 className="text-xl font-black text-amber-950">Settings access is restricted</h1><p className="mt-2 text-sm leading-6 text-amber-900">Only System Admin can manage professions, interview templates and user permissions.</p></div></section>;

  return <section className="mx-auto max-w-7xl p-4 sm:p-6">
    <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-700">System configuration</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">Configure the recruitment workspace.</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage the reference data that powers candidate intake, interview assignment and access controls.</p>
      <div className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-100 pt-4" role="tablist" aria-label="Settings sections">
        {tabs.map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => actions.setTab(value)} title={'Open ' + label} className={'shrink-0 rounded-xl px-3 py-2.5 text-xs font-bold ' + (tab === value ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100')}>{label}</button>)}
      </div>
    </header>

    {tab === 'recruitment' && <div className="mt-4 grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-black text-slate-900">Add profession</h2>
        <p className="mt-1 text-xs text-slate-500">Active professions appear in candidate and job forms.</p>
        <div className="mt-4 flex gap-2"><input value={inputs.newProfession} onChange={(event)=>actions.setNewProfession(event.target.value)} placeholder="e.g. Plumber" className="field-input mt-0"/><button type="button" onClick={actions.addProfession} title="Add profession" className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"><Icon name="plus" size={17}/></button></div>
        <div className="mt-5 space-y-2">{state.professions.map((profession) => <div key={profession.id} className="rounded-xl border border-slate-100 p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-800">{profession.name}</span><button type="button" onClick={()=>actions.toggleProfession(profession.id)} title={(profession.active?'Disable ':'Enable ')+profession.name} className={'rounded-full px-2.5 py-1 text-[10px] font-bold '+(profession.active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500')}>{profession.active?'Active':'Inactive'}</button></div><div className="mt-2 flex flex-wrap gap-1">{profession.skills.map((skill)=><button key={skill} type="button" onClick={()=>actions.removeSkill(profession.id,skill)} title={'Remove '+skill+' skill'} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{skill} ×</button>)}</div><div className="mt-2 flex gap-2"><input value={inputs.newSkill} onChange={(event)=>actions.setNewSkill(event.target.value)} placeholder="Add skill" className="field-input mt-0 text-xs"/><button type="button" onClick={()=>actions.addSkill(profession.id)} title={'Add skill to '+profession.name} className="rounded-xl border border-slate-200 px-3 text-xs font-bold">Add</button></div></div>)}</div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-black text-slate-900">Active profession coverage</h2><p className="mt-1 text-xs text-slate-500">Reference data currently available for recruitment workflows.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{activeProfessions.map((profession)=><div key={profession.id} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-900">{profession.name}</p><p className="mt-1 text-[11px] text-slate-500">{profession.skills.length} skills configured</p><div className="mt-3 flex flex-wrap gap-1">{profession.skills.map((skill)=><span key={skill} className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-600">{skill}</span>)}</div></div>)}</div>
      </section>
    </div>}

    {tab === 'interviews' && <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {state.templates.map((template)=><article key={template.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">{template.profession}</p><h2 className="mt-1 text-sm font-black text-slate-900">{template.name}</h2></div><button type="button" onClick={()=>actions.toggleTemplate(template.id)} title={(template.active?'Disable ':'Enable ')+template.name} className={'rounded-full px-2.5 py-1 text-[10px] font-bold '+(template.active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500')}>{template.active?'Active':'Inactive'}</button></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{template.criteriaCount}</p><p className="text-[10px] text-slate-500">Scorecard criteria</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{template.practicalTaskCount}</p><p className="text-[10px] text-slate-500">Practical tasks</p></div></div></article>)}
    </div>}

    {tab === 'users' && <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_.8fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-sm font-black text-slate-900">Users & permissions</h2><p className="mt-1 text-xs text-slate-500">Frontend permission model for preview. Server authorization remains the production authority.</p><div className="mt-4 divide-y divide-slate-100">{state.users.map((user)=><div key={user.id} className="flex items-center gap-3 py-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{user.name.slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-slate-900">{user.name}</p><p className="truncate text-[11px] text-slate-500">{user.email}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{user.role}</span><button type="button" onClick={()=>actions.toggleUser(user.id)} title={(user.active?'Deactivate ':'Activate ')+user.name} className={'rounded-full px-2.5 py-1 text-[10px] font-bold '+(user.active?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500')}>{user.active?'Active':'Inactive'}</button></div>)}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="text-sm font-black text-slate-900">Add recruiter</h2><div className="mt-4 space-y-3"><input value={inputs.newUserName} onChange={(event)=>actions.setNewUserName(event.target.value)} placeholder="Recruiter name" className="field-input mt-0"/><input value={inputs.newUserEmail} onChange={(event)=>actions.setNewUserEmail(event.target.value)} placeholder="recruiter@example.com" type="email" className="field-input mt-0"/><button type="button" onClick={actions.addRecruiter} title="Add recruiter user" className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Add recruiter</button><button type="button" onClick={()=>actions.resetDemo()} title="Reset frontend settings to demo defaults" className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Reset demo settings</button></div></section>
    </div>}

    {tab === 'accessibility' && <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">Manual verification</p><h2 className="mt-2 text-xl font-black text-slate-950">Accessibility QA checklist</h2><p className="mt-2 text-sm leading-6 text-slate-500">Run these checks in the deployed app on keyboard, touch and a screen reader. This panel records that the checklist exists; it does not claim device validation.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{['Keyboard reaches every actionable control.', 'Focus remains visible and trapped in dialogs.', 'Escape closes mobile navigation and dialogs.', 'Screen reader labels identify icons, fields and actions.', 'Mobile tap targets remain comfortable at 320px width.', 'Reduced-motion mode does not break transitions.', 'Long candidate lists and tables remain scrollable.'].map((item)=><label key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-700"><input type="checkbox" className="mt-0.5"/><span>{item}</span></label>)}</div><button type="button" onClick={()=>dispatch({type:'SET_VIEW',view:'candidate-portal'})} title="Open candidate portal preview" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Preview candidate portal <Icon name="arrow-right" size={15}/></button></section>}
  </section>;
};

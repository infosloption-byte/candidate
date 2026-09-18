import { useState } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../../auth/hooks/useAuth';
import type { Candidate } from '../../candidates/types/candidate';

interface CandidatePortalLoginProps {
  candidates: Candidate[];
}

export const CandidatePortalLogin = ({ candidates }: CandidatePortalLoginProps) => {
  const { dispatch } = useAuth();
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!candidateId) {
      setError('Select the candidate account to continue.');
      return;
    }
    if (code.trim() !== '123456') {
      setError('For the frontend demo, use access code 123456.');
      return;
    }
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate) {
      setError('Candidate account could not be found.');
      return;
    }
    dispatch({ type: 'LOGIN_CANDIDATE', user: { id: 'candidate-session-' + candidate.id, name: candidate.name, role: 'candidate', candidateId: candidate.id } });
    setError('');
  };

  return <section className="grid min-h-[70dvh] place-items-center p-5 sm:p-8">
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="grid size-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon name="users" size={22}/></div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-700">Candidate access</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Complete your BuildHire onboarding</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">This frontend preview uses a candidate account selector and one-time demo code. Real invitation tokens and identity verification belong to the backend.</p>
      <label className="mt-6 block text-xs font-bold text-slate-600">Candidate account<select value={candidateId} onChange={(event)=>setCandidateId(event.target.value)} className="field-input"><option value="">Choose candidate</option>{candidates.map((candidate)=><option key={candidate.id} value={candidate.id}>{candidate.name} · {candidate.reference}</option>)}</select></label>
      <label className="mt-4 block text-xs font-bold text-slate-600">Access code<input value={code} onChange={(event)=>setCode(event.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" className="field-input"/></label>
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
      <button type="button" onClick={submit} title="Sign in to candidate onboarding" className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white">Continue to onboarding</button>
    </div>
  </section>;
};

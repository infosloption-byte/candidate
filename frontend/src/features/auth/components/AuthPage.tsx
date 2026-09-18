import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../../../shared/components/Icon';
import { useAuth } from '../hooks/useAuth';
import { roleDescription, roleLabel } from '../services/permissions';
import type { AuthRole } from '../types/auth';
import type { Candidate } from '../../candidates/types/candidate';

interface AuthPageProps {
  candidates: Candidate[];
}

const staffRoles: AuthRole[] = ['system-admin', 'recruiter', 'interviewer', 'manager'];

export const AuthPage = ({ candidates }: AuthPageProps) => {
  const { state, dispatch } = useAuth();
  const [role, setRole] = useState<AuthRole>('recruiter');
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? '');
  const [email, setEmail] = useState('recruiter@buildhire.demo');
  const [password, setPassword] = useState('password');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const candidateOptions = useMemo(
    () => candidates.map((candidate) => ({ id: candidate.id, label: candidate.name + ' · ' + candidate.reference })),
    [candidates],
  );

  const signIn = () => {
    if (role === 'candidate') {
      const candidate = candidates.find((item) => item.id === candidateId);
      if (!candidate) return setError('Choose a candidate account.');
      if (password !== '123456') return setError('Candidate demo access code is 123456.');
      dispatch({
        type: 'LOGIN_CANDIDATE',
        user: {
          id: 'candidate-session-' + candidate.id,
          name: candidate.name,
          email: candidate.phone,
          role: 'candidate',
          candidateId: candidate.id,
        },
      });
      setError('');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    dispatch({
      type: 'LOGIN',
      user: { id: 'demo-' + role, name: roleLabel(role), email: email.trim(), role },
    });
    setError('');
  };

  const submitResetRequest = () => {
    if (!resetEmail.trim()) {
      setError('Enter the account email.');
      return;
    }
    dispatch({ type: 'OPEN_RESET_PASSWORD', email: resetEmail });
    setError('');
  };

  const completeReset = () => {
    if (newPassword.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    dispatch({
      type: 'COMPLETE_RESET_PASSWORD',
      notice: 'Password reset completed in the frontend prototype. Backend identity and credential storage remain the production authority.',
    });
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const shell = (title: string, subtitle: string, content: ReactNode) => (
    <section className="grid min-h-screen place-items-center bg-slate-100 p-4 sm:p-8">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
            <Icon name="briefcase" size={21} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">BuildHire access</p>
            <p className="text-sm font-black text-slate-950">Construction Candidate ERP</p>
          </div>
        </div>

        <h1 className="mt-7 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>

        {state.notice && <div className="mt-4 rounded-xl bg-cyan-50 p-3 text-xs font-semibold text-cyan-800" role="status">
          {state.notice}
          <button type="button" onClick={() => dispatch({ type: 'DISMISS_NOTICE' })} title="Dismiss notice" className="ml-2 font-black">×</button>
        </div>}

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
        {content}
      </div>
    </section>
  );

  if (state.authView === 'forgot') {
    return shell('Recover your account', 'Enter the email used for the recruitment workspace.', <>
      <label className="field-label mt-6">Account email
        <input value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} type="email" className="field-input" placeholder="you@example.com" />
      </label>
      <button type="button" onClick={submitResetRequest} title="Request a password reset" className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white">Send reset link</button>
      <button type="button" onClick={() => { dispatch({ type: 'LOGOUT' }); setError(''); }} title="Return to sign in" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600">Back to sign in</button>
    </>);
  }

  if (state.authView === 'reset') {
    return shell('Set a new password', 'Choose a new password for this prototype account.', <>
      <label className="field-label mt-6">New password
        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" className="field-input" />
      </label>
      <label className="field-label mt-4">Confirm password
        <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" className="field-input" />
      </label>
      <button type="button" onClick={completeReset} title="Complete password reset" className="mt-4 w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white">Reset password</button>
      <button type="button" onClick={() => dispatch({ type: 'LOGOUT' })} title="Return to sign in" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600">Back to sign in</button>
    </>);
  }

  return shell(
    state.authView === 'expired' ? 'Session expired' : 'Sign in to BuildHire',
    state.authView === 'expired'
      ? 'Your session ended. Sign in again to return to the recruitment workspace.'
      : 'Choose a workspace role. Candidates use the self-service portal.',
    <>
      <label className="field-label mt-6">Account role
        <select value={role} onChange={(event) => setRole(event.target.value as AuthRole)} className="field-input">
          {[...staffRoles, 'candidate' as const].map((item) => <option key={item} value={item}>{roleLabel(item)}</option>)}
        </select>
      </label>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <strong className="text-slate-900">{roleLabel(role)}</strong> — {roleDescription(role)}
      </div>

      {role === 'candidate' && <label className="field-label mt-4">Candidate account
        <select value={candidateId} onChange={(event) => setCandidateId(event.target.value)} className="field-input">
          <option value="">Choose candidate</option>
          {candidateOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>}

      <label className="field-label mt-4">{role === 'candidate' ? 'Access code' : 'Email'}
        <input value={role === 'candidate' ? password : email} onChange={(event) => role === 'candidate' ? setPassword(event.target.value) : setEmail(event.target.value)} type={role === 'candidate' ? 'text' : 'email'} inputMode={role === 'candidate' ? 'numeric' : undefined} className="field-input" placeholder={role === 'candidate' ? '123456' : 'you@example.com'} />
      </label>

      {role !== 'candidate' && <label className="field-label mt-4">Password
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="field-input" placeholder="Demo password" />
      </label>}

      <button type="button" onClick={signIn} title="Sign in to the selected BuildHire workspace" className="mt-5 w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white">Sign in</button>
      {role !== 'candidate' && <button type="button" onClick={() => { dispatch({ type: 'OPEN_FORGOT_PASSWORD' }); setError(''); }} title="Open password recovery" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600">Forgot password?</button>}

      <p className="mt-4 text-center text-[10px] leading-4 text-slate-400">
        Frontend authentication preview only. Credentials, invitation tokens, password storage and authorization are enforced by the backend in production.
      </p>
    </>,
  );
};

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFocusTrap } from '../../../shared/hooks/useFocusTrap';

export const AuthPasswordDialog = () => {
  const { state, dispatch } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const open = state.authView === 'change-password' && state.authenticated;
  const close = () => dispatch({ type: 'COMPLETE_CHANGE_PASSWORD', notice: '' });
  const dialogRef = useFocusTrap<HTMLDivElement>({ enabled: open, onEscape: close });

  if (!open) return null;

  const submit = () => {
    if (!currentPassword.trim()) return setError('Enter your current password.');
    if (nextPassword.length < 8) return setError('Use at least 8 characters.');
    if (nextPassword !== confirmPassword) return setError('New passwords do not match.');

    dispatch({
      type: 'COMPLETE_CHANGE_PASSWORD',
      notice: 'Password changed in the frontend prototype. Backend credential storage remains the production authority.',
    });
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    setError('');
  };

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
    <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-wider text-cyan-700">Account security</p><h2 id="change-password-title" className="mt-1 text-xl font-black text-slate-950">Change password</h2></div>
        <button type="button" onClick={close} aria-label="Close change password" title="Close change password" className="rounded-lg px-2 py-1 text-slate-400">×</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
      <label className="field-label mt-5">Current password<input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" className="field-input" autoComplete="current-password" /></label>
      <label className="field-label mt-4">New password<input value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} type="password" className="field-input" autoComplete="new-password" /></label>
      <label className="field-label mt-4">Confirm new password<input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" className="field-input" autoComplete="new-password" /></label>
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={close} title="Cancel password change" className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="button" onClick={submit} title="Save new password" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white">Change password</button></div>
    </div>
  </div>;
};

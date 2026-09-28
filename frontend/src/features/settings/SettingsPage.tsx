import { useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { SectionHeading } from '../../shared/components/SectionHeading';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';
import { Icon } from '../../shared/components/Icon';
import { apiFetch } from '../../shared/lib/api';

export const SettingsPage = () => {
  const { user, refreshUser, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [busySessions, setBusySessions] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const saveProfile = async () => {
    setSavingProfile(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
      });
      await refreshUser();
      setSuccess('Account profile updated successfully.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setSavingPassword(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
      setPassword('');
      setConfirmPassword('');
      await refreshUser();
      setSuccess('Password changed and active sessions were refreshed.');
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to change your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const logoutAll = async () => {
    setBusySessions(true);
    setError('');
    try {
      await apiFetch('/auth/logout-all', { method: 'POST' });
      await logout();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to close active sessions.');
    } finally {
      setBusySessions(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl space-y-5 p-3 sm:p-6 lg:p-8">
      <SectionHeading
        eyebrow={user?.role === 'ADMIN' ? t('Platform administration') : t('Account administration')}
        title="Settings"
        description={t('Manage your account, security, language and interface preferences.')}
      />

      {error && <StateMessage kind="error" title="Settings action failed" description={error} />}
      {success && <StateMessage kind="success" title="Saved" description={success} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon name="users" size={18} /></div>
            <div><h2 className="text-base font-black text-slate-950">{t('My account')}</h2><p className="text-xs text-slate-400">{t('Update the name and login email for your current account')}</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <FormField label={t("Name")}><input className="field-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></FormField>
            <FormField label="Email"><input className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></FormField>
            <div className="flex justify-end"><Button onClick={() => void saveProfile()} disabled={savingProfile}>{savingProfile ? t('Saving…') : t('Save Profile')}</Button></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-rose-50 text-rose-700"><Icon name="lock" size={18} /></div>
            <div><h2 className="text-base font-black text-slate-950">{t('Security')}</h2><p className="text-xs text-slate-400">{t('Change the current account password.')}</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <FormField label={t("New password")} hint={t("Use at least 8 characters.")}><input className="field-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" placeholder="New password" /></FormField>
            <FormField label={t("Confirm password")}><input className="field-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder={t("Repeat password")} /></FormField>
            <div className="flex justify-end"><Button onClick={() => void changePassword()} disabled={savingPassword}>{savingPassword ? t('Updating…') : t('Change password')}</Button></div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Icon name="settings" size={18} /></div>
            <div><h2 className="text-base font-black text-slate-950">{t('Interface preferences')}</h2><p className="text-xs text-slate-400">{t('These preferences apply to this browser.')}</p></div>
          </div>
          <div className="mt-5 space-y-4">
            <FormField label={t("Language")}>
              <select className="field-input" value={language} onChange={(event) => setLanguage(event.target.value as 'en' | 'he')}>
                <option value="en">English</option>
                <option value="he">עברית</option>
              </select>
            </FormField>
            <div className="rounded-2xl bg-slate-50 p-3.5 text-xs leading-5 text-slate-500">
              {t('Sidebar collapse state and language preference are stored locally in this browser. Platform-wide configuration belongs in a future persistent platform configuration service.')}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-700"><Icon name="alert" size={18} /></div>
            <div><h2 className="text-base font-black text-slate-950">Active sessions</h2><p className="text-xs text-slate-400">Close all active sessions for this account when you suspect credential exposure.</p></div>
          </div>
          <div className="mt-5">
            <Button variant="danger" onClick={() => void logoutAll()} disabled={busySessions}>{busySessions ? 'Closing sessions…' : 'Sign out all sessions'}</Button>
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{t('Current access')}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">{t('Role')}</p><p className="mt-1 text-sm font-black text-slate-900">{user?.role ?? 'Unknown'}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">Company</p><p className="mt-1 text-sm font-black text-slate-900">{user?.companyName ?? 'Platform'}</p></div>
          <div className="rounded-xl bg-slate-50 p-3"><p className="text-[9px] font-black uppercase text-slate-400">{t('Account')}</p><p className="mt-1 text-sm font-black text-emerald-700">{user?.active ? 'Active' : 'Inactive'}</p></div>
        </div>
      </Card>
    </section>
  );
};

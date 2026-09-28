import { useEffect, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { apiFetch } from '../../shared/lib/api';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';

interface PublicAgency {
  id: string;
  name: string;
  slug: string;
}

export const LoginPage = () => {
  const { login, registerCompany, registerInterviewee, error: sessionError } = useAuth();
  const [mode, setMode] = useState<'login' | 'company-register' | 'candidate-register'>('login');
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agencyId, setAgencyId] = useState('');
  const [phone, setPhone] = useState('');
  const [profession, setProfession] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [skills, setSkills] = useState('');
  const [agencies, setAgencies] = useState<PublicAgency[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingAgencies, setLoadingAgencies] = useState(false);

  useEffect(() => {
    if (mode !== 'candidate-register') return;

    let cancelled = false;
    setLoadingAgencies(true);

    apiFetch<PublicAgency[]>('/public/agencies')
      .then((result) => {
        if (cancelled) return;
        setAgencies(result);
        setAgencyId((current) => current || result[0]?.id || '');
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : 'Unable to load agencies.');
      })
      .finally(() => {
        if (!cancelled) setLoadingAgencies(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const submit = async () => {
    setSubmitting(true);
    setError('');

    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError('Email and password are required.');
          return;
        }

        await login({ email: email.trim(), password });
        return;
      }

      if (mode === 'company-register') {
        if (!companyName.trim() || !name.trim() || !email.trim() || password.length < 8) {
          setError('Company name, administrator name, email, and password (8+ characters) are required.');
          return;
        }

        await registerCompany({
          companyName: companyName.trim(),
          companySlug: companySlug.trim(),
          adminName: name.trim(),
          email: email.trim(),
          password,
        });
        return;
      }

      if (!name.trim() || !email.trim() || password.length < 8 || !agencyId) {
        setError('Name, email, password (8+ characters), and agency are required.');
        return;
      }

      await registerInterviewee({
        name: name.trim(),
        email: email.trim(),
        password,
        agencyId,
        phone: phone.trim(),
        profession: profession.trim(),
        experienceYears: experienceYears ? Number(experienceYears) : null,
        skills: skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      });
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue.');
    } finally {
      setSubmitting(false);
    }
  };

  const message = error || sessionError;

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-cyan-400">B</div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">
            {mode === 'login' ? 'Welcome to BuildHire' : mode === 'company-register' ? 'Register your company' : 'Create your candidate account'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {mode === 'login'
              ? 'Sign in to manage recruitment, interviews, and candidate onboarding.'
              : mode === 'company-register'
                ? 'Create your company workspace and become the first company administrator.'
                : 'Choose your agency and submit your candidate profile to get started.'}
          </p>
        </div>

        {message && <StateMessage kind="error" title={mode === 'login' ? 'Sign-in failed' : 'Registration failed'} description={message} />}

        <Card>
          <div className="space-y-4">
            {mode === 'company-register' && (
              <>
                <FormField label="Company name"><input autoComplete="organization" className="field-input" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Example Manpower Services" /></FormField>
                <FormField label="Company identifier" hint="Used as your workspace identifier and must be unique."><input className="field-input" value={companySlug} onChange={(event) => setCompanySlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="example-manpower" /></FormField>
                <FormField label="Company administrator name"><input autoComplete="name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></FormField>
              </>
            )}

            {mode === 'candidate-register' && (
              <>
                <FormField label="Full name"><input autoComplete="name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} /></FormField>
                <FormField label="Agency">
                  <select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)} disabled={loadingAgencies || agencies.length === 0}>
                    {agencies.length === 0 ? <option value="">{loadingAgencies ? 'Loading agencies…' : 'No active agencies'}</option> : agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
                  </select>
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Phone"><input autoComplete="tel" className="field-input" value={phone} onChange={(event) => setPhone(event.target.value)} /></FormField>
                  <FormField label="Profession"><input className="field-input" value={profession} onChange={(event) => setProfession(event.target.value)} placeholder="Mason, Welder…" /></FormField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Experience years"><input type="number" min="0" max="60" className="field-input" value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} /></FormField>
                  <FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Masonry, Tile, Plaster" /></FormField>
                </div>
              </>
            )}

            <FormField label="Email"><input type="email" autoComplete="email" className="field-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></FormField>
            <FormField label="Password"><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="field-input" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'} /></FormField>

            <Button className="w-full" onClick={() => void submit()} disabled={submitting || (mode === 'candidate-register' && loadingAgencies)}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'company-register' ? 'Create company workspace' : 'Create candidate account'}
            </Button>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 text-center space-y-2">
            {mode === 'login' ? (
              <>
                <button type="button" className="block w-full text-xs font-bold text-slate-700 hover:text-slate-950" onClick={() => { setMode('company-register'); setError(''); }}>
                  Register your company
                </button>
                <button type="button" className="block w-full text-xs font-bold text-slate-500 hover:text-slate-950" onClick={() => { setMode('candidate-register'); setError(''); }}>
                  Create a candidate account
                </button>
              </>
            ) : (
              <button type="button" className="text-xs font-bold text-slate-600 hover:text-slate-950" onClick={() => { setMode('login'); setError(''); }}>
                Back to sign in
              </button>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
};


import { useEffect, useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { apiFetch } from '../../shared/lib/api';
import { FormField } from '../../shared/components/FormField';
import { useLanguage } from '../../i18n/LanguageContext';
import './auth.css';

interface PublicAgency {
  id: string;
  name: string;
  slug: string;
}

type AuthMode = 'login' | 'company-register' | 'candidate-register';

export const LoginPage = () => {
  const { login, registerCompany, registerInterviewee, error: sessionError } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [mode, setMode] = useState<AuthMode>(() => {
    const requestedMode = new URLSearchParams(window.location.search).get('mode');
    return requestedMode === 'company-register'
      ? 'company-register'
      : requestedMode === 'candidate-register'
        ? 'candidate-register'
        : 'login';
  });
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

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    const query = nextMode === 'login' ? '' : '?mode=' + nextMode;
    window.history.replaceState({}, '', '/login' + query);
  };

  const enterApp = () => {
    window.history.replaceState({}, '', '/app');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

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
        enterApp();
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
        enterApp();
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
      enterApp();
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue.');
    } finally {
      setSubmitting(false);
    }
  };

  const message = error || sessionError;
  const heading = mode === 'login'
    ? 'Welcome back'
    : mode === 'company-register'
      ? 'Set up your company workspace'
      : 'Create your candidate account';

  const subheading = mode === 'login'
    ? 'Sign in to manage candidates, jobs, interviews and hiring decisions.'
    : mode === 'company-register'
      ? 'Start with the company account that owns your recruitment workspace.'
      : 'Choose your agency and build the candidate profile used through your recruitment journey.';

  return (
    <main className="bh-auth-page">
      <div className="bh-auth-frame">
        <div className="bh-auth-shell">
          <aside className="bh-auth-rail" aria-label="BuildHire product overview">
            <div className="bh-auth-rail-inner">
              <button type="button" className="bh-auth-brand" onClick={goHome} aria-label="BuildHire home">
                <span className="bh-auth-brand-mark">B</span>
                <span>BuildHire</span>
              </button>

              <div className="bh-auth-rail-kicker">Construction recruitment workflow</div>
              <h2>Move every candidate from <span>intake to deployment.</span></h2>
              <p className="bh-auth-rail-copy">
                Keep agency records, candidate data, panel scores, passport details and final decisions in one controlled workspace.
              </p>

              <div className="bh-auth-pipeline" aria-label="Recruitment pipeline">
                {[
                  ['01', 'Intake', 'CSV or focused candidate entry', mode !== 'login'],
                  ['02', 'Interview', 'Panel assignments and scoring', mode === 'candidate-register'],
                  ['03', 'Evaluation', 'Compare every interviewer', false],
                  ['04', 'Selection', 'Decision with a reason', false],
                  ['05', 'Deployment', 'Documents and next handoff', false],
                ].map(([number, title, text, active]) => (
                  <div key={number} className={'bh-auth-pipeline-item' + (active ? ' active' : '')}>
                    <span className="bh-auth-pipeline-num">{number}</span>
                    <div>
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </div>
                    <span className="bh-auth-pipeline-status">{active ? 'Current' : 'Ready'}</span>
                  </div>
                ))}
              </div>

              <div className="bh-auth-rail-foot">
                <span>Passport expiry</span>
                <span>Agency register no.</span>
                <span>Panel comparison</span>
              </div>
            </div>
          </aside>

          <section className="bh-auth-panel" aria-labelledby="auth-title">
            <div className="bh-auth-topbar">
              <button type="button" className="bh-auth-mobile-brand" onClick={goHome} aria-label="BuildHire home">
                <span className="bh-auth-mobile-mark">B</span>
                <span>BuildHire</span>
              </button>

              <div className="bh-auth-header-actions">
                <button type="button" className="bh-auth-link" onClick={goHome}>Back to website</button>
                <select
                  className="bh-auth-lang"
                  aria-label="Language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as 'en' | 'he')}
                >
                  <option value="en">EN</option>
                  <option value="he">HE</option>
                </select>
              </div>
            </div>

            <div className="bh-auth-context">
              {mode === 'login' ? 'Secure access / recruitment workspace' : 'Account setup / build your workspace'}
            </div>
            <h1 id="auth-title" className="bh-auth-heading">{heading}</h1>
            <p className="bh-auth-subheading">{subheading}</p>

            <div className="bh-auth-tabs three" role="tablist" aria-label="Authentication">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={'bh-auth-tab' + (mode === 'login' ? ' active' : '')} onClick={() => changeMode('login')}>
                Sign in
              </button>
              <button type="button" role="tab" aria-selected={mode === 'company-register'} className={'bh-auth-tab' + (mode === 'company-register' ? ' active' : '')} onClick={() => changeMode('company-register')}>
                Company signup
              </button>
              <button type="button" role="tab" aria-selected={mode === 'candidate-register'} className={'bh-auth-tab' + (mode === 'candidate-register' ? ' active' : '')} onClick={() => changeMode('candidate-register')}>
                Candidate signup
              </button>
            </div>

            {message && (
              <div className="bh-auth-alert" role="alert">
                <div className="bh-auth-alert-title">{mode === 'login' ? 'Sign-in failed' : 'Registration failed'}</div>
                <div className="bh-auth-alert-copy">{message}</div>
              </div>
            )}

            <form className="bh-auth-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
              {mode === 'company-register' && (
                <div className="bh-auth-grid">
                  <FormField label="Company name">
                    <input autoComplete="organization" className="field-input" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Example Manpower Services" />
                  </FormField>
                  <FormField label="Company identifier" hint="Used as your workspace identifier and must be unique.">
                    <input className="field-input" value={companySlug} onChange={(event) => setCompanySlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} placeholder="example-manpower" />
                  </FormField>
                  <FormField label="Company administrator name">
                    <input autoComplete="name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
                  </FormField>
                </div>
              )}

              {mode === 'candidate-register' && (
                <div className="bh-auth-grid">
                  <FormField label="Full name">
                    <input autoComplete="name" className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" />
                  </FormField>
                  <FormField label="Agency">
                    <select className="field-input" value={agencyId} onChange={(event) => setAgencyId(event.target.value)} disabled={loadingAgencies || agencies.length === 0}>
                      {agencies.length === 0
                        ? <option value="">{loadingAgencies ? 'Loading agencies…' : 'No active agencies'}</option>
                        : agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
                    </select>
                  </FormField>

                  <div className="bh-auth-grid two">
                    <FormField label="Phone"><input autoComplete="tel" className="field-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+94 ..." /></FormField>
                    <FormField label="Profession"><input className="field-input" value={profession} onChange={(event) => setProfession(event.target.value)} placeholder="Mason, Welder…" /></FormField>
                  </div>

                  <div className="bh-auth-grid two">
                    <FormField label="Experience years"><input type="number" min="0" max="60" className="field-input" value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} placeholder="0" /></FormField>
                    <FormField label="Skills" hint="Separate skills with commas."><input className="field-input" value={skills} onChange={(event) => setSkills(event.target.value)} placeholder="Masonry, Tile, Plaster" /></FormField>
                  </div>
                </div>
              )}

              <div className="bh-auth-grid" style={{ marginTop: mode === 'login' ? 0 : 14 }}>
                <FormField label="Email">
                  <input type="email" autoComplete="email" className="field-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                </FormField>

                <FormField label="Password">
                  <input
                    type="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="field-input"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
                  />
                </FormField>
              </div>

              <button className="bh-auth-submit" type="submit" disabled={submitting || (mode === 'candidate-register' && loadingAgencies)}>
                {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in to BuildHire' : mode === 'company-register' ? 'Create company workspace' : 'Create candidate account'}
              </button>

              <div className="bh-auth-footer">
                {mode === 'login' ? (
                  <>
                    <button type="button" className="bh-auth-link" onClick={() => changeMode('company-register')}>Register your company</button>
                    <button type="button" className="bh-auth-link" onClick={() => changeMode('candidate-register')}>Create a candidate account</button>
                  </>
                ) : (
                  <button type="button" className="bh-auth-link" onClick={() => changeMode('login')}>Back to sign in</button>
                )}
              </div>

              <p className="bh-auth-mode-note">
                {mode === 'login'
                  ? 'Your existing BuildHire account keeps the same permissions and workspace.'
                  : mode === 'company-register'
                    ? 'Company registration creates the company workspace and first administrator.'
                    : 'Candidate registration connects your profile to an available agency.'}
              </p>
              <p className="bh-auth-footnote">BuildHire · Construction recruitment management</p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};

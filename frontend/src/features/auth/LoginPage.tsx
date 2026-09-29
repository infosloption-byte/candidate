
import { useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { FormField } from '../../shared/components/FormField';
import { useLanguage } from '../../i18n/LanguageContext';
import { SelectMenu } from '../../shared/components/SelectMenu';
import './auth.css';

type AuthMode = 'login' | 'company-register';

export const LoginPage = () => {
  const { login, registerCompany, error: sessionError } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [mode, setMode] = useState<AuthMode>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'company-register' ? 'company-register' : 'login',
  );
  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to continue.');
    } finally {
      setSubmitting(false);
    }
  };

  const message = error || sessionError;
  const heading = mode === 'login' ? 'Welcome back' : 'Set up your company workspace';
  const subheading = mode === 'login'
    ? 'Sign in to manage candidates, jobs, interviews and hiring decisions.'
    : 'Start your 7-day free trial with the company account that owns your recruitment workspace.';

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

              <div className="bh-auth-rail-body">
                <h2>One workspace for every <span>construction hire.</span></h2>
                <ul className="bh-auth-points">
                  <li>Candidate intake and CSV import</li>
                  <li>Panel interviews and scoring</li>
                  <li>Decisions, documents and deployment</li>
                </ul>
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
                <SelectMenu
                  value={language}
                  onChange={(value) => setLanguage(value as 'en' | 'he')}
                  options={[{ value: 'en', label: 'EN' }, { value: 'he', label: 'HE' }]}
                  ariaLabel="Language"
                  className="w-20"
                />
              </div>
            </div>

            <div className="bh-auth-context">
              {mode === 'login' ? 'Secure access / recruitment workspace' : 'Account setup / 7-day free trial'}
            </div>
            <h1 id="auth-title" className="bh-auth-heading">{heading}</h1>
            <p className="bh-auth-subheading">{subheading}</p>

            <div className="bh-auth-tabs" role="tablist" aria-label="Authentication">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={'bh-auth-tab' + (mode === 'login' ? ' active' : '')} onClick={() => changeMode('login')}>
                Sign in
              </button>
              <button type="button" role="tab" aria-selected={mode === 'company-register'} className={'bh-auth-tab' + (mode === 'company-register' ? ' active' : '')} onClick={() => changeMode('company-register')}>
                Company signup
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

              <button className="bh-auth-submit" type="submit" disabled={submitting}>
                {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in to BuildHire' : 'Start 7-day free trial'}
              </button>

              <div className="bh-auth-footer">
                {mode === 'login' ? (
                  <button type="button" className="bh-auth-link" onClick={() => changeMode('company-register')}>Register your company</button>
                ) : (
                  <button type="button" className="bh-auth-link" onClick={() => changeMode('login')}>Back to sign in</button>
                )}
              </div>

              <p className="bh-auth-mode-note">
                {mode === 'login'
                  ? 'Sign in with the email and password of your BuildHire account.'
                  : 'Company registration creates your workspace and first administrator. Try free for 7 days, then billed monthly.'}
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};

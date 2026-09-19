import { useState } from 'react';
import { useAuth } from '../../domain/authContext';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { FormField } from '../../shared/components/FormField';
import { StateMessage } from '../../shared/components/StateMessage';

export const LoginPage = () => {
  const { login, error: sessionError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await login({ email: email.trim(), password });
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const message = error || sessionError;

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-950 text-lg font-black text-cyan-400">B</div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950">Welcome to BuildHire</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage recruitment, interviews, and candidate onboarding.</p>
        </div>

        {message && <StateMessage kind="error" title="Sign-in failed" description={message} />}

        <Card>
          <div className="space-y-4">
            <FormField label="Email">
              <input
                type="email"
                autoComplete="email"
                className="field-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </FormField>
            <FormField label="Password">
              <input
                type="password"
                autoComplete="current-password"
                className="field-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }}
                placeholder="Your password"
              />
            </FormField>
            <Button className="w-full" onClick={() => void submit()} disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
};

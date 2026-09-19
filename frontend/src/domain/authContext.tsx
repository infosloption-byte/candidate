import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { User, UserRole } from './types';
import { ApiError, apiFetch } from '../shared/lib/api';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterIntervieweeInput {
  name: string;
  email: string;
  password: string;
  agencyId: string;
  phone: string;
  profession: string;
  experienceYears: number | null;
  skills: string[];
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  developmentMode: boolean;
  login: (input: LoginInput) => Promise<void>;
  registerInterviewee: (input: RegisterIntervieweeInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const isDev = import.meta.env.DEV;

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [developmentMode, setDevelopmentMode] = useState(false);

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ user: User }>('/auth/me')
      .then((result) => {
        if (!cancelled) {
          setUser(result.user);
          setDevelopmentMode(false);
          setLoading(false);
        }
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;

        if (requestError instanceof ApiError && requestError.status === 401) {
          setLoading(false);
          return;
        }

        if (isDev) {
          setDevelopmentMode(true);
          setLoading(false);
          return;
        }

        setError(requestError instanceof Error ? requestError.message : 'Unable to load your session.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async ({ email, password }: LoginInput): Promise<void> => {
    setError(null);
    const result = await apiFetch<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setUser(result.user);
    setDevelopmentMode(false);
  };

  const registerInterviewee = async (input: RegisterIntervieweeInput): Promise<void> => {
    setError(null);
    const result = await apiFetch<{ user: User }>('/auth/register/interviewee', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(result.user);
    setDevelopmentMode(false);
  };

  const logout = async (): Promise<void> => {
    setError(null);

    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({ user, loading, error, developmentMode, login, registerInterviewee, logout }),
    [user, loading, error, developmentMode],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};

export const developmentUser = (role: UserRole): User => ({
  id: 'dev-' + role.toLowerCase(),
  agencyId: role === 'ADMIN' || role === 'INTERVIEWEE' ? null : 'agency-1',
  candidateId: role === 'INTERVIEWEE' ? 'candidate-1' : null,
  name: 'Development Session',
  email: 'dev-' + role.toLowerCase() + '@buildhire.local',
  role,
  active: true,
});

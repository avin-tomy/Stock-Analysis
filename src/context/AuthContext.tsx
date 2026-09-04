import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface PublicUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.error === 'string' ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = await res.json();
        return body.user as PublicUser;
      })
      .catch(() => null)
      .then((restoredUser) => {
        if (!cancelled) {
          setUser(restoredUser);
          setIsAuthLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login: AuthContextValue['login'] = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Failed to log in'));
    }
    const body = await res.json();
    setUser(body.user);
  };

  const signup: AuthContextValue['signup'] = async (name, email, password) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      throw new Error(await parseErrorMessage(res, 'Failed to sign up'));
    }
    const body = await res.json();
    setUser(body.user);
  };

  const logout: AuthContextValue['logout'] = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: user !== null,
        isAuthLoading,
        userEmail: user?.email ?? null,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

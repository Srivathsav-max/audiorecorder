"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from './auth';
import { setCookie, getCookie, removeCookie, AUTH_COOKIE_NAME } from './cookies';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token and validate it
    const token = getCookie(AUTH_COOKIE_NAME);
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setUser(data.user);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    setCookie(AUTH_COOKIE_NAME, data.token);
    setUser(data.user);
    window.location.href = '/';  // Force a full page reload to update middleware state
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    setCookie(AUTH_COOKIE_NAME, data.token);
    setUser(data.user);
    window.location.href = '/';  // Force a full page reload to update middleware state
  };

  const logout = () => {
    removeCookie(AUTH_COOKIE_NAME);
    setUser(null);
    window.location.href = '/login';  // Redirect to login page after logout
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

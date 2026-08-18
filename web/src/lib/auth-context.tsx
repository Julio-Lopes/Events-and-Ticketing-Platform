"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch, ApiError } from "./api";
import type { AuthUser, LoginResponse } from "./types";

const STORAGE_KEY = "elite:session";

interface Session {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** false so depois de tentar ler o localStorage no primeiro render. */
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  /**
   * localStorage nao existe no primeiro render do servidor, entao a
   * leitura acontece so no efeito. `ready` evita que uma tela protegida
   * redirecione para o login por uma fracao de segundo antes da sessao
   * salva ser recuperada.
   */
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Session | null) => {
    setSession(next);
    if (next) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      persist({ token: res.accessToken, user: res.user });
      return res.user;
    },
    [persist],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await apiFetch<LoginResponse>("/auth/register", {
        method: "POST",
        body: { name, email, password },
      });
      persist({ token: res.accessToken, user: res.user });
      return res.user;
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      ready,
      login,
      register,
      logout,
    }),
    [session, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  return ctx;
}

/**
 * Wrapper de conveniencia: chama apiFetch ja com o token da sessao.
 * Se a API responder 401 (token expirado ou invalidado), desloga na
 * hora em vez de deixar a tela num estado autenticado mentiroso.
 */
export function useAuthedFetch() {
  const { token, logout } = useAuth();

  return useCallback(
    async <T,>(path: string, options: Parameters<typeof apiFetch>[1] = {}) => {
      try {
        return await apiFetch<T>(path, { ...options, token: token ?? undefined });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout();
        throw err;
      }
    },
    [token, logout],
  );
}
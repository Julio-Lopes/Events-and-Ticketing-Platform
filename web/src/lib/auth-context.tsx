"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
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
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Le a sessao salva. Fora do navegador (render do servidor) devolve
 * null, porque localStorage nao existe la.
 */
function readStoredSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * `ready` sinaliza que a hidratacao terminou e a leitura do
 * localStorage ja vale. Sem ele, uma tela protegida redirecionaria
 * para o login por uma fracao de segundo antes de recuperar a sessao
 * salva, mesmo com o usuario logado.
 *
 * useSyncExternalStore resolve isso sem efeito e sem render em
 * cascata: devolve o valor do servidor ate a hidratacao acabar, e o
 * do cliente depois. A alternativa (ler no efeito e chamar setState)
 * renderiza duas vezes e e o que o lint aponta.
 */
const subscribeNoop = () => () => {};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const ready = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const [session, setSession] = useState<Session | null>(readStoredSession);

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
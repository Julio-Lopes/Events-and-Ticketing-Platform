"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { BackLink } from "@/components/back-link";

/**
 * Atalho para quem for avaliar: clicar preenche o formulario, nao
 * envia sozinho. Da para ver o e-mail antes de confirmar, e evita um
 * login "magico" que esconderia o fluxo real do formulario.
 */
const DEMO_ACCOUNTS: { email: string; label: string }[] = [
  { email: "organizador@elite.dev", label: "organizador" },
  { email: "cliente1@elite.dev", label: "cliente" },
  { email: "portaria@elite.dev", label: "portaria" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      /**
       * Todo papel cai na mesma rota por enquanto. Painel do organizador
       * e tela da portaria ainda nao existem; quando existirem, o
       * redirecionamento passa a ser por papel.
       */
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      <div className="w-full lg:w-[44%] flex items-center justify-center p-6 py-10 lg:py-6">
        <div className="w-full max-w-sm">
          <div className="mb-5">
            <BackLink href="/" label="catálogo" />
          </div>

          <div className="bg-surface rounded-lg overflow-hidden">
            <div className="h-[3px] bg-amber" />
            <div className="p-6 sm:p-7">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-3.5 bg-amber shrink-0" aria-hidden />
                <p className="font-mono text-[10px] tracking-[0.25em] text-amber">BILHETERIA</p>
              </div>
              <h1 className="text-[28px] leading-tight font-semibold text-ink mt-3">Entrar</h1>

              <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted">
                    E-MAIL
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-surface-dim border border-line rounded-sm px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-amber"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-muted">
                    SENHA
                  </span>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-surface-dim border border-line rounded-sm px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-amber"
                  />
                </label>

                {error && (
                  <p className="text-xs text-danger" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-amber justify-center py-3 mt-2 text-[11px] disabled:opacity-60"
                >
                  {loading ? "ENTRANDO..." : "ENTRAR"}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-line-soft/60 bg-surface-dim/40 px-4 py-3.5">
            <p className="font-mono text-[9px] tracking-[0.2em] text-muted-2">
              CONTAS DE TESTE · SENHA elite123
            </p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.email}>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword("elite123");
                    }}
                    className="font-mono text-[11px] text-muted hover:text-amber transition-colors"
                  >
                    {acc.email} <span className="text-muted-2">— {acc.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="hidden lg:block relative flex-1 overflow-hidden bg-surface-dim">
        <div className="absolute inset-0 curtain-texture" />
        <div className="absolute inset-0 curtain-glow" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-bg/20" />
        <div className="absolute bottom-12 left-12">
          <p className="font-mono text-[13px] tracking-[0.4em] text-amber/80">BILHETERIA</p>
        </div>
      </div>
    </main>
  );
}
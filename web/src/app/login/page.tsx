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
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-3">
          <BackLink href="/" label="catálogo" />
        </div>

        <div className="bg-surface rounded-lg p-6">
          <p className="font-mono text-[10px] tracking-wider text-amber">BILHETERIA</p>
          <h1 className="text-xl font-medium text-ink mt-1">Entrar</h1>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-wider text-muted">E-MAIL</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] tracking-wider text-muted">SENHA</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink"
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
              className="btn-amber justify-center py-2.5 mt-1 disabled:opacity-60"
            >
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>
          </form>
        </div>

        <div className="mt-4 px-1">
          <p className="font-mono text-[10px] tracking-wider text-muted-2">
            CONTAS DE TESTE · SENHA elite123
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword("elite123");
                  }}
                  className="font-mono text-[11px] text-muted hover:text-amber"
                >
                  {acc.email} <span className="text-muted-2">— {acc.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
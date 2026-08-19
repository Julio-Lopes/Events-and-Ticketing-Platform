"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = {
  ORGANIZER: "organizador",
  CUSTOMER: "cliente",
  GATE: "portaria",
};

/**
 * Cabecalho global. Substitui a antiga SessionBar: alem de mostrar
 * quem esta logado, agora e a forma principal de voltar ao catalogo
 * e de chegar em "meus ingressos" de qualquer tela do site.
 */
export function SiteHeader() {
  const { user, ready, logout } = useAuth();

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5 border-b border-line">
      <Link
        href="/"
        className="font-mono text-[11px] tracking-wider text-amber hover:opacity-80 shrink-0"
      >
        BILHETERIA
      </Link>

      {!ready ? null : (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] ml-auto">
          {user?.role === "CUSTOMER" && (
            <Link href="/meus-ingressos" className="text-muted hover:text-ink">
              meus ingressos
            </Link>
          )}
          {user?.role === "ORGANIZER" && (
            <Link href="/organizador" className="text-muted hover:text-ink">
              painel
            </Link>
          )}
          {user?.role === "GATE" && (
            <Link href="/portaria" className="text-muted hover:text-ink">
              portaria
            </Link>
          )}
          {user ? (
            <>
              <span className="text-muted-2">·</span>
              <span className="text-ink">{user.name}</span>
              <span className="text-muted-2">·</span>
              <span className="text-muted">{ROLE_LABEL[user.role]}</span>
              <span className="text-muted-2">·</span>
              <button onClick={logout} className="text-amber hover:opacity-80">
                sair
              </button>
            </>
          ) : (
            <Link href="/login" className="text-amber hover:opacity-80">
              entrar
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
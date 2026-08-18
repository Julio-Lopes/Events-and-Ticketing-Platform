"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useAuthedFetch } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { TicketCard } from "@/components/ticket-card";
import { BackLink } from "@/components/back-link";
import type { Ticket } from "@/lib/types";

export default function MyTicketsPage() {
  const { user, ready } = useAuth();
  const authedFetch = useAuthedFetch();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.push("/login");
      return;
    }
    authedFetch<Ticket[]>("/tickets/mine")
      .then(setTickets)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Não foi possível carregar seus ingressos.",
        ),
      );
  }, [ready, user, authedFetch, router]);

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-sm mx-auto flex flex-col gap-4">
        <BackLink href="/" label="catálogo" />

        <header>
          <p className="font-mono text-[10px] tracking-wider text-amber">SEU ACERVO</p>
          <h1 className="text-2xl font-medium text-ink mt-1">Meus ingressos</h1>
        </header>

        {tickets === null && !error && (
          <p className="text-sm text-muted font-mono">CARREGANDO...</p>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        {tickets?.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted">Você ainda não tem ingressos.</p>
            <Link href="/" className="text-amber text-sm mt-2 inline-block">
              Ver eventos em cartaz
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {tickets?.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>
    </main>
  );
}
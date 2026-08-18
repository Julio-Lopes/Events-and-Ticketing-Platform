"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useAuthedFetch } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { BackLink } from "@/components/back-link";
import { formatEventDateTime } from "@/lib/format";
import type { OrganizerEvent } from "@/lib/types";

export default function OrganizerPage() {
  const { user, ready } = useAuth();
  const authedFetch = useAuthedFetch();
  const router = useRouter();

  const [events, setEvents] = useState<OrganizerEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "ORGANIZER") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  async function load() {
    try {
      const list = await authedFetch<OrganizerEvent[]>("/events/mine");
      setEvents(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível carregar seus eventos.");
    }
  }

  async function togglePublish(event: OrganizerEvent) {
    setActionError(null);
    setBusyId(event.id);
    try {
      const path = event.status === "PUBLISHED" ? "unpublish" : "publish";
      await authedFetch(`/events/${event.id}/${path}`, { method: "POST" });
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Não foi possível atualizar o evento.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(event: OrganizerEvent) {
    if (!window.confirm(`Excluir "${event.title}"? Isso não pode ser desfeito.`)) return;
    setActionError(null);
    setBusyId(event.id);
    try {
      await authedFetch(`/events/${event.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível excluir o evento.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) return null;

  if (user && user.role !== "ORGANIZER") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center flex flex-col items-center gap-3">
          <p className="text-sm text-ink">Esta área é só para contas de organizador.</p>
          <BackLink href="/" label="catálogo" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        <BackLink href="/" label="catálogo" />

        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-wider text-amber">PAINEL</p>
            <h1 className="text-2xl font-medium text-ink mt-1">Seus eventos</h1>
          </div>
          <Link href="/organizador/novo" className="btn-amber shrink-0">
            + Novo evento
          </Link>
        </header>

        {error && <p className="text-sm text-danger">{error}</p>}
        {actionError && <p className="text-sm text-danger">{actionError}</p>}

        {events === null && !error && (
          <p className="text-sm text-muted font-mono">CARREGANDO...</p>
        )}

        {events?.length === 0 && <p className="text-sm text-muted">Nenhum evento ainda.</p>}

        <div className="flex flex-col gap-3">
          {events?.map((event) => (
            <div key={event.id} className="bg-surface rounded-md p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-wider text-amber">
                    {formatEventDateTime(event.startsAt)}
                  </p>
                  <h2 className="text-[15px] font-medium text-ink mt-0.5 truncate">
                    {event.title}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    {event.venue} · {event.city}
                  </p>
                </div>
                <span
                  className={`ticket-badge shrink-0 ${
                    event.status === "PUBLISHED"
                      ? "text-amber border border-amber-dim"
                      : "text-muted border border-line-soft"
                  }`}
                >
                  {event.status === "PUBLISHED" ? "PUBLICADO" : "RASCUNHO"}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-3 text-xs text-muted font-mono">
                <span>{event.sectors.length} setor(es)</span>
                <span>·</span>
                <span>{event._count.tickets} ingresso(s) emitido(s)</span>
              </div>

              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  disabled={busyId === event.id}
                  onClick={() => togglePublish(event)}
                  className="font-mono text-[11px] text-amber hover:opacity-80 disabled:opacity-50"
                >
                  {event.status === "PUBLISHED" ? "despublicar" : "publicar"}
                </button>
                <button
                  type="button"
                  disabled={busyId === event.id}
                  onClick={() => remove(event)}
                  className="font-mono text-[11px] text-danger hover:opacity-80 disabled:opacity-50 ml-auto"
                >
                  excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
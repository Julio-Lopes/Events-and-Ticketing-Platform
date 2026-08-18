"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAuthedFetch } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { GateSession } from "@/components/gate-session";
import { BackLink } from "@/components/back-link";

interface GateEvent {
  id: string;
  title: string;
  venue: string;
  city: string;
  startsAt: string;
}

/** Lembra a ultima sessao escolhida entre recarregamentos do turno. */
const LAST_EVENT_KEY = "elite:gate-event";

export default function GatePage() {
  const { user, ready } = useAuth();
  const authedFetch = useAuthedFetch();
  const router = useRouter();

  const [events, setEvents] = useState<GateEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "GATE") return;

    authedFetch<GateEvent[]>("/gate/events")
      .then((list) => {
        setEvents(list);
        const saved = window.localStorage.getItem(LAST_EVENT_KEY);
        if (saved && list.some((e) => e.id === saved)) setEventId(saved);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar os eventos."),
      );
  }, [ready, user, authedFetch, router]);

  function selectEvent(id: string) {
    setEventId(id);
    window.localStorage.setItem(LAST_EVENT_KEY, id);
  }

  if (!ready) return null;

  if (user && user.role !== "GATE") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center flex flex-col items-center gap-3">
          <p className="text-sm text-ink">Esta área é só para contas de portaria.</p>
          <BackLink href="/" label="catálogo" />
        </div>
      </main>
    );
  }

  const current = events?.find((e) => e.id === eventId);

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-xs mx-auto flex flex-col gap-4">
        <BackLink href="/" label="catálogo" />

        <header>
          <p className="font-mono text-[10px] tracking-wider text-amber">PORTARIA</p>
          <h1 className="text-xl font-medium text-ink mt-1">
            {current ? current.title : "Escolha a sessão"}
          </h1>
          {current && (
            <p className="text-sm text-muted mt-0.5">
              {current.venue} · {current.city}
            </p>
          )}
        </header>

        {error && <p className="text-sm text-danger">{error}</p>}

        {!eventId ? (
          <ul className="flex flex-col gap-2">
            {events?.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => selectEvent(e.id)}
                  className="w-full text-left bg-surface rounded-md p-3 border border-transparent hover:border-amber-dim"
                >
                  <p className="text-sm text-ink">{e.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {e.venue} · {e.city}
                  </p>
                </button>
              </li>
            ))}
            {events?.length === 0 && (
              <p className="text-sm text-muted">Nenhuma sessão nas próximas semanas.</p>
            )}
          </ul>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEventId(null)}
              className="font-mono text-[11px] text-muted-2 hover:text-muted self-start"
            >
              trocar sessão
            </button>
            <GateSession eventId={eventId} />
          </>
        )}
      </div>
    </main>
  );
}
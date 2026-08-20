import { apiFetch, ApiError } from "@/lib/api";
import type { EventSummary } from "@/lib/types";
import { EventCard } from "@/components/event-card";
import { SearchBar } from "@/components/search-bar";

interface EventsResponse {
  items: EventSummary[];
  total: number;
}

/**
 * Server Component: a vitrine e publica (GET /events e @Public() na API),
 * entao renderiza no servidor sem esperar hidratacao. `cache: "no-store"`
 * dentro de apiFetch tira a pagina da geracao estatica de proposito,
 * porque preco e disponibilidade nao podem ficar presos num build antigo.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const qs = query ? `?q=${encodeURIComponent(query)}` : "";

  let data: EventsResponse = { items: [], total: 0 };
  let failed = false;
  try {
    data = await apiFetch<EventsResponse>(`/events${qs}`);
  } catch (err) {
    failed = true;
    if (!(err instanceof ApiError)) throw err;
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <header className="pb-5">
          {/*
            Classes escritas por extenso, nao interpoladas. O Tailwind
            escaneia o codigo em busca de strings LITERAIS de classe;
            `bg-${cor}` nunca seria encontrado e as bolinhas sairiam
            sem cor nenhuma.
          */}
          <div className="flex gap-1.5 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-dim" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-dim" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
          </div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-amber-dim uppercase">
            Bilheteria apresenta
          </p>
          <h1 className="font-display text-[42px] sm:text-5xl font-semibold uppercase leading-[0.95] tracking-wide text-ink mt-1.5">
            Em cartaz
          </h1>
          <p className="text-sm text-muted mt-2">
            {data.total} {data.total === 1 ? "evento publicado" : "eventos publicados"}
          </p>
          <div className="ticket-edge mt-4" />
        </header>

        <div className="mt-5">
          <SearchBar initialQuery={query} />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {failed && (
            <p className="text-sm text-danger">
              Não foi possível carregar os eventos agora.
            </p>
          )}
          {!failed && data.items.length === 0 && (
            <p className="text-sm text-muted">Nenhum evento encontrado.</p>
          )}
          {data.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </main>
  );
}
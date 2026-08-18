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
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-2xl mx-auto">
        <header className="border-b border-line pb-4">
          {/*
            Classes escritas por extenso, nao interpoladas. O Tailwind
            escaneia o codigo em busca de strings LITERAIS de classe;
            `bg-${cor}` nunca seria encontrado e as bolinhas sairiam
            sem cor nenhuma.
          */}
          <div className="flex gap-1.5 mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-dim" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-dim" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber" />
          </div>
          <h1 className="text-3xl font-medium text-ink tracking-tight">Em cartaz</h1>
          <p className="text-sm text-muted mt-1">
            {data.total} {data.total === 1 ? "evento publicado" : "eventos publicados"}
          </p>
        </header>

        <div className="mt-4">
          <SearchBar initialQuery={query} />
        </div>

        <div className="mt-5 flex flex-col gap-3.5">
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
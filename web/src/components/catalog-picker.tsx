"use client";

import { useState, type FormEvent } from "react";
import { useAuthedFetch } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import type { CatalogItem, CatalogSearchResult } from "@/lib/types";

const PROVIDER_LABEL: Record<string, string> = {
  TMDB: "TMDb",
  TICKETMASTER: "Ticketmaster",
};

/**
 * Busca no catalogo externo. O resultado alimenta o formulario, nao o
 * substitui: o organizador pode escolher um item e depois editar tudo,
 * ou ignorar a busca e cadastrar do zero.
 */
export function CatalogPicker({ onPick }: { onPick: (item: CatalogItem) => void }) {
  const authedFetch = useAuthedFetch();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<CatalogSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch<CatalogSearchResult>(
        `/catalog/search?q=${encodeURIComponent(q)}&limit=8`,
      );
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível buscar no catálogo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-md p-4">
      <p className="font-mono text-[10px] tracking-wider text-muted">
        BUSCAR NO CATÁLOGO (OPCIONAL)
      </p>

      <form onSubmit={search} className="flex gap-2 mt-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome do filme ou do show"
          className="flex-1 bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted-2"
        />
        <button type="submit" disabled={loading} className="btn-amber px-4 disabled:opacity-60">
          {loading ? "..." : "BUSCAR"}
        </button>
      </form>

      {error && <p className="text-xs text-danger mt-2">{error}</p>}

      {/**
       * Provedor indisponivel e informacao util, nao erro escondido:
       * sem a chave configurada, o organizador precisa saber POR QUE
       * um resultado esperado nao apareceu.
       */}
      {result && result.unavailable.length > 0 && (
        <p className="text-xs text-muted-2 mt-2">
          Sem resposta de: {result.unavailable.map((p) => PROVIDER_LABEL[p] ?? p).join(", ")}
        </p>
      )}

      {result && result.items.length === 0 && (
        <p className="text-xs text-muted mt-2">Nada encontrado.</p>
      )}

      <div className="flex flex-col gap-2 mt-3">
        {result?.items.map((item) => (
          <button
            key={`${item.source}-${item.externalId}`}
            type="button"
            onClick={() => onPick(item)}
            className="flex gap-3 text-left bg-surface-alt rounded-sm p-2 border border-transparent hover:border-amber-dim"
          >
            <div className="w-10 h-14 shrink-0 bg-surface flex items-center justify-center rounded-sm overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-mono text-[8px] text-muted-2">SEM ARTE</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink truncate">{item.title}</p>
              <p className="font-mono text-[10px] text-muted-2 mt-0.5">
                {PROVIDER_LABEL[item.source] ?? item.source}
              </p>
              {item.suggestedVenue && (
                <p className="text-xs text-muted mt-0.5 truncate">
                  {item.suggestedVenue}
                  {item.suggestedCity ? ` · ${item.suggestedCity}` : ""}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
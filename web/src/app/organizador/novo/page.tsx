"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useAuthedFetch } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { BackLink } from "@/components/back-link";
import { CatalogPicker } from "@/components/catalog-picker";
import {
  fromDatetimeLocalValue,
  parsePriceToCents,
  toDatetimeLocalValue,
} from "@/lib/format";
import type { CatalogItem } from "@/lib/types";

interface SectorForm {
  key: string;
  name: string;
  kind: "SEATED" | "GENERAL";
  price: string;
  capacity: string;
  rows: string;
  seatsPerRow: string;
}

function emptySector(kind: SectorForm["kind"] = "SEATED"): SectorForm {
  return {
    key: crypto.randomUUID(),
    name: "",
    kind,
    price: "",
    capacity: "",
    rows: "",
    seatsPerRow: "",
  };
}

export default function NewEventPage() {
  const { user, ready } = useAuth();
  const authedFetch = useAuthedFetch();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [venue, setVenue] = useState("");
  const [city, setCity] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [source, setSource] = useState<CatalogItem["source"]>("MANUAL");
  const [externalId, setExternalId] = useState("");

  const [sectors, setSectors] = useState<SectorForm[]>([emptySector()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) router.push("/login");
  }, [ready, user, router]);

  /**
   * Escolher no catalogo PREENCHE, nunca trava. Os campos continuam
   * editaveis: o organizador pode querer titulo em portugues, poster
   * proprio, ou corrigir o local que veio do Ticketmaster. A API trata
   * o dado externo do mesmo jeito, como sugestao.
   */
  function applyCatalogItem(item: CatalogItem) {
    setTitle(item.title);
    setSynopsis(item.synopsis ?? "");
    setImageUrl(item.imageUrl ?? "");
    setSource(item.source);
    setExternalId(item.externalId);
    if (item.suggestedVenue) setVenue(item.suggestedVenue);
    if (item.suggestedCity) setCity(item.suggestedCity);
    if (item.suggestedStartsAt) setStartsAt(toDatetimeLocalValue(item.suggestedStartsAt));
  }

  function updateSector(key: string, patch: Partial<SectorForm>) {
    setSectors((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    /**
     * Monta exatamente a forma que o DTO da API espera: setor numerado
     * manda rows/seatsPerRow, pista manda capacity. Mandar os dois faz
     * a API recusar, e ela esta certa em recusar.
     */
    const payloadSectors = sectors.map((s) => {
      const priceCents = parsePriceToCents(s.price);
      const base = { name: s.name.trim(), kind: s.kind, priceCents };
      return s.kind === "SEATED"
        ? { ...base, rows: Number(s.rows), seatsPerRow: Number(s.seatsPerRow) }
        : { ...base, capacity: Number(s.capacity) };
    });

    if (payloadSectors.some((s) => Number.isNaN(s.priceCents))) {
      setError("Informe um preço válido em todos os setores.");
      return;
    }

    setSubmitting(true);
    try {
      await authedFetch("/events", {
        method: "POST",
        body: {
          title: title.trim(),
          synopsis: synopsis.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          source,
          externalId: externalId || undefined,
          venue: venue.trim(),
          city: city.trim(),
          startsAt: fromDatetimeLocalValue(startsAt),
          sectors: payloadSectors,
        },
      });
      router.push("/organizador");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o evento.");
    } finally {
      setSubmitting(false);
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

  const inputClass =
    "bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted-2";

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-lg mx-auto flex flex-col gap-5">
        <BackLink href="/organizador" label="painel" />

        <header>
          <p className="font-mono text-[10px] tracking-wider text-amber">PAINEL</p>
          <h1 className="text-2xl font-medium text-ink mt-1">Novo evento</h1>
        </header>

        <CatalogPicker onPick={applyCatalogItem} />

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-surface rounded-md p-4 flex flex-col gap-3">
            <p className="font-mono text-[10px] tracking-wider text-muted">DADOS DO EVENTO</p>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-2">TÍTULO</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-2">SINOPSE</span>
              <textarea
                rows={3}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                className={`${inputClass} resize-none`}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-2">URL DO PÔSTER</span>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </label>

            <div className="flex gap-3">
              <label className="flex flex-col gap-1 flex-1">
                <span className="font-mono text-[10px] text-muted-2">LOCAL</span>
                <input
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1 flex-1">
                <span className="font-mono text-[10px] text-muted-2">CIDADE</span>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] text-muted-2">DATA E HORA</span>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputClass}
              />
            </label>

            {source !== "MANUAL" && (
              <p className="font-mono text-[10px] text-muted-2">
                origem: {source} · {externalId}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <p className="font-mono text-[10px] tracking-wider text-muted">SETORES</p>

            {sectors.map((sector, index) => (
              <div key={sector.key} className="bg-surface rounded-md p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted-2">SETOR {index + 1}</span>
                  {sectors.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSectors((prev) => prev.filter((s) => s.key !== sector.key))
                      }
                      className="font-mono text-[10px] text-danger hover:opacity-80"
                    >
                      remover
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="font-mono text-[10px] text-muted-2">NOME</span>
                    <input
                      required
                      value={sector.name}
                      onChange={(e) => updateSector(sector.key, { name: e.target.value })}
                      placeholder="Sala 3, Pista, Camarote"
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 w-28">
                    <span className="font-mono text-[10px] text-muted-2">PREÇO (R$)</span>
                    <input
                      required
                      inputMode="decimal"
                      value={sector.price}
                      onChange={(e) => updateSector(sector.key, { price: e.target.value })}
                      placeholder="32,00"
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateSector(sector.key, { kind: "SEATED" })}
                    className={`ticket-badge ${
                      sector.kind === "SEATED"
                        ? "bg-amber text-amber-ink"
                        : "text-muted border border-line-soft"
                    }`}
                  >
                    LUGAR MARCADO
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSector(sector.key, { kind: "GENERAL" })}
                    className={`ticket-badge ${
                      sector.kind === "GENERAL"
                        ? "bg-amber text-amber-ink"
                        : "text-muted border border-line-soft"
                    }`}
                  >
                    PISTA
                  </button>
                </div>

                {sector.kind === "SEATED" ? (
                  <div className="flex gap-3">
                    <label className="flex flex-col gap-1 flex-1">
                      <span className="font-mono text-[10px] text-muted-2">FILEIRAS</span>
                      <input
                        required
                        type="number"
                        min={1}
                        max={26}
                        value={sector.rows}
                        onChange={(e) => updateSector(sector.key, { rows: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 flex-1">
                      <span className="font-mono text-[10px] text-muted-2">
                        LUGARES POR FILEIRA
                      </span>
                      <input
                        required
                        type="number"
                        min={1}
                        max={60}
                        value={sector.seatsPerRow}
                        onChange={(e) => updateSector(sector.key, { seatsPerRow: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] text-muted-2">CAPACIDADE</span>
                    <input
                      required
                      type="number"
                      min={1}
                      value={sector.capacity}
                      onChange={(e) => updateSector(sector.key, { capacity: e.target.value })}
                      className={inputClass}
                    />
                  </label>
                )}
              </div>
            ))}

            {sectors.length < 10 && (
              <button
                type="button"
                onClick={() => setSectors((prev) => [...prev, emptySector("GENERAL")])}
                className="font-mono text-[11px] text-amber hover:opacity-80 self-start"
              >
                + adicionar setor
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-amber justify-center py-3 disabled:opacity-60"
          >
            {submitting ? "CRIANDO..." : "CRIAR COMO RASCUNHO"}
          </button>

          <p className="text-xs text-muted-2 text-center">
            O evento nasce como rascunho. Publique pelo painel quando estiver pronto.
          </p>
        </form>
      </div>
    </main>
  );
}
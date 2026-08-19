"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SeatGrid } from "./seat-grid";
import { useAuth, useAuthedFetch } from "@/lib/auth-context";
import { formatCents } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { EventAvailability, Order, SectorAvailability } from "@/lib/types";

/**
 * Teto de UX, nao de validacao. O DTO da API permite ate 10 lugares
 * por setor e ate 5 setores por pedido; 8 aqui e so um limite razoavel
 * para nao deixar alguem montar um carrinho gigante numa interface
 * pensada para compra rapida. A API continua sendo a fonte de verdade:
 * ela recusa o que passar do que faz sentido, o front so evita chegar la.
 */
const MAX_ITEMS_UX = 8;

interface Props {
  eventId: string;
  availability: EventAvailability;
}

export function PurchaseBuilder({ eventId, availability }: Props) {
  const { user, ready } = useAuth();
  const authedFetch = useAuthedFetch();
  const router = useRouter();

  const [selectedSeats, setSelectedSeats] = useState<Record<string, Set<string>>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalItems = useMemo(() => {
    const seatCount = Object.values(selectedSeats).reduce((n, set) => n + set.size, 0);
    const qtyCount = Object.values(quantities).reduce((n, q) => n + q, 0);
    return seatCount + qtyCount;
  }, [selectedSeats, quantities]);

  const totalCents = useMemo(() => {
    let total = 0;
    for (const sector of availability.sectors) {
      if (sector.kind === "SEATED") {
        total += (selectedSeats[sector.id]?.size ?? 0) * sector.priceCents;
      } else {
        total += (quantities[sector.id] ?? 0) * sector.priceCents;
      }
    }
    return total;
  }, [availability.sectors, selectedSeats, quantities]);

  function toggleSeat(sector: SectorAvailability, seatId: string) {
    setError(null);
    setSelectedSeats((prev) => {
      const current = new Set(prev[sector.id] ?? []);
      if (current.has(seatId)) {
        current.delete(seatId);
      } else {
        if (totalItems >= MAX_ITEMS_UX) return prev;
        current.add(seatId);
      }
      return { ...prev, [sector.id]: current };
    });
  }

  function setQuantity(sector: SectorAvailability, next: number) {
    setError(null);
    const capped = Math.max(0, Math.min(next, sector.available, 10));
    setQuantities((prev) => ({ ...prev, [sector.id]: capped }));
  }

  async function handleReserve() {
    setError(null);

    const items = availability.sectors
      .map((sector) => {
        if (sector.kind === "SEATED") {
          const seatIds = [...(selectedSeats[sector.id] ?? [])];
          return seatIds.length ? { sectorId: sector.id, seatIds } : null;
        }
        const quantity = quantities[sector.id] ?? 0;
        return quantity > 0 ? { sectorId: sector.id, quantity } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (!items.length) {
      setError("Selecione ao menos um lugar.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await authedFetch<Order>("/orders", {
        method: "POST",
        body: { eventId, items },
      });
      router.push(`/pedidos/${order.id}`);
    } catch (err) {
      /**
       * 409 aqui e o caso normal de concorrencia: alguem reservou o
       * mesmo assento um instante antes. A mensagem da API ja e clara
       * o bastante para mostrar direto; so limpamos a selecao daquele
       * assento seria o ideal, mas re-buscar a disponibilidade inteira
       * e mais simples e mais correto neste momento.
       */
      setError(err instanceof ApiError ? err.message : "Não foi possível reservar.");
    } finally {
      setSubmitting(false);
    }
  }

  const canBuy = ready && user?.role === "CUSTOMER";

  return (
    <div className="flex flex-col gap-5">
      {availability.sectors.map((sector) => (
        <div key={sector.id} className="bg-surface rounded-md p-4 sm:p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-[15px] font-medium text-ink tracking-wide">{sector.name}</h3>
            <span className="font-mono text-[13px] text-amber">
              {formatCents(sector.priceCents)}
            </span>
          </div>

          {sector.kind === "SEATED" ? (
            sector.seats && sector.seats.length ? (
              <SeatGrid
                seats={sector.seats}
                selected={selectedSeats[sector.id] ?? new Set()}
                onToggle={(seatId) => toggleSeat(sector, seatId)}
              />
            ) : (
              <p className="text-sm text-muted">Nenhum assento cadastrado.</p>
            )
          ) : sector.available > 0 ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(sector, (quantities[sector.id] ?? 0) - 1)}
                className="w-7 h-7 rounded-sm border border-line-soft text-ink font-mono transition-colors hover:border-amber-dim"
              >
                −
              </button>
              <span className="font-mono text-sm text-ink w-6 text-center">
                {quantities[sector.id] ?? 0}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(sector, (quantities[sector.id] ?? 0) + 1)}
                className="w-7 h-7 rounded-sm border border-line-soft text-ink font-mono transition-colors hover:border-amber-dim"
              >
                +
              </button>
              <span className="font-mono text-[11px] text-muted-2 ml-1">
                {sector.available} disponíveis
              </span>
            </div>
          ) : (
            <span className="ticket-badge text-muted border border-line-soft">ESGOTADO</span>
          )}
        </div>
      ))}

      <div className="sticky bottom-4 bg-surface rounded-md p-4 sm:p-5 flex items-center gap-3 border-t-2 border-amber/60 shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.5)]">
        <div className="flex-1">
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-2">TOTAL</p>
          <p className="text-2xl font-semibold text-ink mt-0.5">{formatCents(totalCents)}</p>
        </div>

        {!ready ? null : !user ? (
          <Link href="/login" className="btn-amber px-5 py-3 text-[11px]">
            Entrar para reservar
          </Link>
        ) : !canBuy ? (
          <span className="text-xs text-muted">
            Contas de organizador e portaria não compram ingressos.
          </span>
        ) : (
          <button
            type="button"
            onClick={handleReserve}
            disabled={submitting || totalItems === 0}
            className="btn-amber px-5 py-3 text-[11px] disabled:opacity-40 enabled:shadow-[0_0_16px_-4px_rgba(232,163,61,0.55)]"
          >
            {submitting ? "RESERVANDO..." : `RESERVAR (${totalItems})`}
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useAuthedFetch } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { formatCents, formatEventDateTime } from "@/lib/format";
import { BackLink } from "@/components/back-link";
import type { Order } from "@/lib/types";

/** Espelha os cartoes deterministicos documentados no README da API. */
const DECLINE_HINTS = [
  { suffix: "0000", reason: "saldo insuficiente" },
  { suffix: "0002", reason: "cartão bloqueado" },
  { suffix: "0004", reason: "suspeita de fraude" },
];

/**
 * Pagina inteiramente client-side, sem excecao.
 *
 * O token da sessao vive no localStorage, que nao existe no primeiro
 * render do servidor. Diferente do catalogo e do detalhe do evento,
 * que sao publicos e por isso Server Component, aqui nao ha como
 * buscar o pedido sem o token, entao nao ha ganho em tentar renderizar
 * qualquer parte no servidor.
 */
export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user, ready } = useAuth();
  const authedFetch = useAuthedFetch();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const [cardNumber, setCardNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.push("/login");
      return;
    }
    authedFetch<Order>(`/orders/${id}`)
      .then(setOrder)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Reserva não encontrada."),
      );
  }, [ready, user, id, authedFetch, router]);

  /** Cronometro visual. O prazo real quem decide e o servidor. */
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = order ? new Date(order.expiresAt).getTime() - now : 0;
  const expired = remainingMs <= 0;
  const remainingLabel = useMemo(() => formatCountdown(Math.max(remainingMs, 0)), [remainingMs]);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!order) return;
    setPayError(null);
    setPaying(true);
    try {
      await authedFetch<Order>(`/orders/${order.id}/payment`, {
        method: "POST",
        body: {
          cardNumber: cardNumber.replace(/\s/g, ""),
          holderName,
          expiry,
          cvv,
        },
      });
      router.push("/meus-ingressos");
    } catch (err) {
      /**
       * Recusa NAO limpa o formulario nem redireciona. O pedido segue
       * PENDING no servidor ate o prazo acabar, entao trocar de cartao
       * e tentar de novo, no mesmo pedido, e o caminho esperado.
       */
      setPayError(
        err instanceof ApiError ? err.message : "Não foi possível processar o pagamento.",
      );
    } finally {
      setPaying(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    try {
      await authedFetch(`/orders/${order.id}`, { method: "DELETE" });
    } catch {
      // Se ja expirou ou ja foi paga, o cancelamento nao faz sentido
      // mesmo; segue para a mesma tela de saida de qualquer jeito.
    }
    router.push(`/eventos/${order.event.id}`);
  }

  if (!ready || (!order && !loadError)) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted font-mono">CARREGANDO...</p>
      </main>
    );
  }

  if (loadError || !order) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center flex flex-col items-center gap-3">
          <p className="text-sm text-danger">{loadError}</p>
          <BackLink href="/" label="voltar ao catálogo" />
        </div>
      </main>
    );
  }

  if (order.status === "PAID") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center flex flex-col items-center gap-3">
          <p className="text-sm text-ink">Este pedido já foi pago.</p>
          <Link href="/meus-ingressos" className="stamp-btn inline-flex">
            Ver meus ingressos
          </Link>
          <BackLink href="/" label="catálogo" />
        </div>
      </main>
    );
  }

  if (order.status !== "PENDING" || expired) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <p className="text-sm text-ink">
            {expired ? "O tempo da reserva acabou." : "Esta reserva não está mais disponível."}
          </p>
          <p className="text-xs text-muted mt-1">Os lugares foram devolvidos ao estoque.</p>
          <Link href={`/eventos/${order.event.id}`} className="stamp-btn inline-flex mt-3">
            Escolher novamente
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-sm mx-auto flex flex-col gap-5">
        <BackLink href={`/eventos/${order.event.id}`} label="voltar ao evento" />

        <div className="crop-marks bg-surface border border-line p-4">
          <span className="poster-tag">{formatEventDateTime(order.event.startsAt)}</span>
          <h1 className="font-display text-xl font-semibold uppercase tracking-wide text-ink mt-2">
            {order.event.title}
          </h1>
          <ul className="mt-3 flex flex-col gap-1">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-muted">
                  {item.sector.name}
                  {item.seat ? ` · ${item.seat.row}${item.seat.number}` : ""}
                </span>
                <span className="text-ink font-mono text-xs">{formatCents(item.priceCents)}</span>
              </li>
            ))}
          </ul>
          <div className="ticket-edge mt-3" />
          <div className="flex justify-between mt-3">
            <span className="text-sm text-ink">Total</span>
            <span className="font-display text-lg font-semibold text-amber">
              {formatCents(order.totalCents)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted">tempo restante para pagar</span>
          <span className="font-mono text-sm text-amber">{remainingLabel}</span>
        </div>

        <form onSubmit={handlePay} className="bg-surface border border-line p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-wider text-muted">
              NÚMERO DO CARTÃO
            </span>
            <input
              inputMode="numeric"
              required
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4111 1111 1111 1111"
              className="bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-wider text-muted">NOME NO CARTÃO</span>
            <input
              required
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              className="bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-col gap-1 flex-1">
              <span className="font-mono text-[10px] tracking-wider text-muted">VALIDADE</span>
              <input
                required
                placeholder="MM/AA"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="flex flex-col gap-1 w-20">
              <span className="font-mono text-[10px] tracking-wider text-muted">CVV</span>
              <input
                required
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="bg-surface-alt border border-line rounded-sm px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>

          {payError && (
            <p className="text-xs text-danger" role="alert">
              {payError}
            </p>
          )}

          <button
            type="submit"
            disabled={paying}
            className="stamp-btn justify-center py-2.5 mt-1 disabled:opacity-60"
          >
            {paying ? "PROCESSANDO..." : `PAGAR ${formatCents(order.totalCents)}`}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-muted-2 hover:text-muted mt-1"
          >
            cancelar reserva
          </button>
        </form>

        <div>
          <p className="font-mono text-[10px] tracking-wider text-muted-2">
            CARTÕES DE TESTE PARA RECUSA
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {DECLINE_HINTS.map((h) => (
              <li key={h.suffix} className="font-mono text-[11px] text-muted">
                final {h.suffix} — {h.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
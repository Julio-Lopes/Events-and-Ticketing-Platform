import Link from "next/link";
import type { EventSummary } from "@/lib/types";
import { formatCents, formatEventDateTime } from "@/lib/format";

/**
 * <img> puro, nao next/image. Os posteres vem do TMDb ou do Ticketmaster,
 * hosts de terceiros que mudam de evento para evento; next/image exige
 * permitir cada dominio de antemao em next.config, o que nao da para
 * fazer para um provedor externo imprevisivel. Trocaria por next/image
 * se um dia a plataforma passar a hospedar as proprias imagens.
 */
export function EventCard({ event }: { event: EventSummary }) {
  const kinds = new Set(event.sectors.map((s) => s.kind));
  const hasSeated = kinds.has("SEATED");
  const hasGeneral = kinds.has("GENERAL");
  const ctaLabel = hasSeated ? "Escolher lugar" : "Comprar";

  return (
    <div className="bg-surface rounded-md overflow-hidden flex">
      <div className="w-[84px] shrink-0 bg-surface-alt flex items-center justify-center">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-mono text-[9px] tracking-wider text-muted-2 text-center px-1">
            PÔSTER
          </span>
        )}
      </div>

      <div className="flex-1 p-3.5 stub-divider min-w-0">
        <p className="font-mono text-[10px] tracking-wider text-amber">
          {formatEventDateTime(event.startsAt)}
        </p>
        <h2 className="text-[17px] font-medium text-ink leading-tight mt-1 truncate">
          {event.title}
        </h2>
        <p className="text-[13px] text-muted mt-0.5 truncate">
          {event.venue} · {event.city}
        </p>

        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {hasSeated && (
            <span className="ticket-badge text-amber border border-amber-dim">
              LUGAR MARCADO
            </span>
          )}
          {hasGeneral && (
            <span className="ticket-badge text-muted border border-line-soft">PISTA</span>
          )}
        </div>
      </div>

      <div className="w-[100px] shrink-0 stub-divider flex flex-col items-center justify-center gap-2 px-2">
        <div className="text-center">
          <p className="font-mono text-[9px] tracking-wider text-muted-2">A PARTIR DE</p>
          <p className="text-[15px] font-medium text-ink">
            {event.priceFromCents !== null ? formatCents(event.priceFromCents) : "—"}
          </p>
        </div>
        <Link href={`/eventos/${event.id}`} className="btn-amber w-full">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
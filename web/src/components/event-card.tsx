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
    <Link
      href={`/eventos/${event.id}`}
      className="group crop-marks flex gap-3.5 sm:gap-4 bg-surface border border-line px-3 py-3.5 sm:px-4 sm:py-4 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-[3px] hover:border-amber-dim hover:shadow-[0_18px_34px_-18px_rgba(0,0,0,0.7)]"
    >
      <div className="poster-frame w-[92px] sm:w-[118px] aspect-[2/3] shrink-0 overflow-hidden bg-surface-alt border border-line-soft">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt=""
            className="w-full h-full object-cover transition-[filter] duration-200 ease-out group-hover:brightness-[1.08] group-hover:saturate-[1.05]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center px-1.5">
            <span className="font-mono text-[9px] tracking-[0.15em] text-muted-2 text-center leading-relaxed">
              PÔSTER
              <br />
              INDISPONÍVEL
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <span className="poster-tag self-start">{formatEventDateTime(event.startsAt)}</span>

        <h2 className="font-display text-[21px] sm:text-[25px] font-semibold uppercase leading-[1.08] tracking-wide text-ink mt-2.5 truncate transition-colors group-hover:text-amber">
          {event.title}
        </h2>
        <p className="text-[13px] text-muted mt-1 truncate">
          {event.venue} · {event.city}
        </p>

        <div className="flex gap-1.5 mt-auto pt-3 flex-wrap">
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

      <div className="stub-divider w-[92px] sm:w-[108px] shrink-0 flex flex-col items-center justify-center gap-2.5 pl-3 sm:pl-4 text-center">
        <div>
          <p className="font-mono text-[9px] tracking-[0.12em] text-muted-2">A PARTIR DE</p>
          <p className="font-display text-[18px] sm:text-[20px] font-semibold text-ink mt-0.5">
            {event.priceFromCents !== null ? formatCents(event.priceFromCents) : "—"}
          </p>
        </div>
        <span className="stamp-btn w-full">{ctaLabel}</span>
      </div>
    </Link>
  );
}

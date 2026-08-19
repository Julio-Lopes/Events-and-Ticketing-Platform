import { notFound } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { EventAvailability, EventDetail } from "@/lib/types";
import { formatEventDateTime } from "@/lib/format";
import { PurchaseBuilder } from "@/components/purchase-builder";
import { BackLink } from "@/components/back-link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;

  let event: EventDetail;
  let availability: EventAvailability;
  try {
    [event, availability] = await Promise.all([
      apiFetch<EventDetail>(`/events/${id}`),
      apiFetch<EventAvailability>(`/events/${id}/availability`),
    ]);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <BackLink href="/" label="catálogo" />

        <div className="bg-surface rounded-md overflow-hidden flex">
          <div className="w-32 sm:w-40 shrink-0 bg-surface-alt flex items-center justify-center ring-1 ring-inset ring-amber-dim/15">
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-[9px] tracking-wider text-muted-2">PÔSTER</span>
            )}
          </div>
          <div className="flex-1 p-4 sm:p-5 stub-divider min-w-0">
            <p className="font-mono text-[10px] tracking-[0.15em] text-amber">
              {formatEventDateTime(event.startsAt)}
            </p>
            <h1 className="text-xl sm:text-2xl font-semibold text-ink mt-1.5 leading-tight">
              {event.title}
            </h1>
            <p className="text-sm text-muted mt-1">
              {event.venue} · {event.city}
            </p>
            {event.synopsis && (
              <p className="text-[13px] text-muted-2 mt-3 leading-relaxed">{event.synopsis}</p>
            )}
          </div>
        </div>

        <PurchaseBuilder eventId={event.id} availability={availability} />
      </div>
    </main>
  );
}
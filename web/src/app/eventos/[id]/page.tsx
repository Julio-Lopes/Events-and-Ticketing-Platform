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
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <BackLink href="/" label="catálogo" />

        <div className="bg-surface rounded-md overflow-hidden flex">
          <div className="w-28 shrink-0 bg-surface-alt flex items-center justify-center">
            {event.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-[9px] tracking-wider text-muted-2">PÔSTER</span>
            )}
          </div>
          <div className="flex-1 p-4 stub-divider">
            <p className="font-mono text-[10px] tracking-wider text-amber">
              {formatEventDateTime(event.startsAt)}
            </p>
            <h1 className="text-xl font-medium text-ink mt-1">{event.title}</h1>
            <p className="text-sm text-muted mt-0.5">
              {event.venue} · {event.city}
            </p>
            {event.synopsis && (
              <p className="text-sm text-muted-2 mt-2 leading-relaxed">{event.synopsis}</p>
            )}
          </div>
        </div>

        <PurchaseBuilder eventId={event.id} availability={availability} />
      </div>
    </main>
  );
}
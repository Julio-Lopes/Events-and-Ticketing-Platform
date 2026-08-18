import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Ticket } from "@/lib/types";
import { formatEventDateTime } from "@/lib/format";

export function TicketCard({ ticket }: { ticket: Ticket }) {
  const [copied, setCopied] = useState(false);
  const used = ticket.status !== "VALID";

  async function handleCopy() {
    await navigator.clipboard.writeText(ticket.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`bg-surface rounded-md overflow-hidden relative ${used ? "opacity-60" : ""}`}
    >
      {used && (
        <span className="absolute top-3 right-3 font-mono text-[10px] tracking-wider text-muted-2 border-2 border-muted-2 rounded-sm px-2 py-0.5 -rotate-6">
          {ticket.status === "USED" ? "UTILIZADO" : "CANCELADO"}
        </span>
      )}

      <div className="p-4">
        <p className="font-mono text-[10px] tracking-wider text-amber">
          {formatEventDateTime(ticket.event.startsAt)}
        </p>
        <h2 className="text-lg font-medium text-ink mt-1">{ticket.event.title}</h2>
        <p className="text-sm text-muted mt-0.5">
          {ticket.event.venue} · {ticket.event.city}
        </p>
        <p className="text-sm text-muted-2 mt-1">
          {ticket.sector}
          {ticket.seat ? ` · lugar ${ticket.seat}` : ""} · {ticket.holderName}
        </p>
      </div>

      <div className="stub-divider mx-4" />

      <div className="p-4 flex items-center gap-4">
        {ticket.qrPayload ? (
          <div className="bg-paper rounded-sm p-2 shrink-0">
            <QRCodeSVG value={ticket.qrPayload} size={88} />
          </div>
        ) : (
          <div className="w-[104px] h-[88px] rounded-sm bg-surface-alt flex items-center justify-center shrink-0">
            <span className="font-mono text-[9px] text-muted-2 text-center px-2">
              sem QR ativo
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] tracking-wider text-muted-2">CÓDIGO</p>
          <p className="font-mono text-sm text-ink tracking-wider">{ticket.code}</p>

          <button
            type="button"
            onClick={handleCopy}
            className="font-mono text-[11px] text-amber hover:opacity-80 mt-2"
          >
            {copied ? "link copiado" : "copiar link do ingresso"}
          </button>
        </div>
      </div>
    </div>
  );
}
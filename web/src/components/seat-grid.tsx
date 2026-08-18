import type { SeatInfo } from "@/lib/types";

interface Props {
  seats: SeatInfo[];
  selected: Set<string>;
  onToggle: (seatId: string) => void;
}

/**
 * Puramente apresentacional: nao guarda estado proprio, so desenha
 * o que recebe e avisa cliques. Quem decide se um clique e permitido
 * (limite de lugares, assento ja ocupado) e o PurchaseBuilder.
 */
export function SeatGrid({ seats, selected, onToggle }: Props) {
  const rows = groupByRow(seats);

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map(([row, rowSeats]) => (
        <div key={row} className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-muted-2 w-4 text-right shrink-0">
            {row}
          </span>
          <div className="flex gap-1 flex-wrap">
            {rowSeats.map((seat) => {
              const isSelected = selected.has(seat.id);
              const isFree = seat.state === "FREE";
              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={!isFree && !isSelected}
                  onClick={() => onToggle(seat.id)}
                  title={`${row}${seat.number} · ${stateLabel(seat.state)}`}
                  className={seatClass(seat.state, isSelected)}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupByRow(seats: SeatInfo[]): [string, SeatInfo[]][] {
  const map = new Map<string, SeatInfo[]>();
  for (const seat of seats) {
    const list = map.get(seat.row) ?? [];
    list.push(seat);
    map.set(seat.row, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function stateLabel(state: SeatInfo["state"]) {
  if (state === "SOLD") return "vendido";
  if (state === "HELD") return "reservado agora";
  return "livre";
}

function seatClass(state: SeatInfo["state"], selected: boolean): string {
  const base =
    "w-6 h-6 rounded-sm text-[10px] font-mono flex items-center justify-center transition-colors";

  if (selected) return `${base} bg-amber text-amber-ink`;
  if (state === "SOLD") return `${base} bg-surface-alt text-muted-2 cursor-not-allowed opacity-50`;
  if (state === "HELD") return `${base} bg-surface-alt text-muted-2 cursor-not-allowed`;
  return `${base} bg-surface-alt text-muted border border-line-soft hover:border-amber-dim`;
}
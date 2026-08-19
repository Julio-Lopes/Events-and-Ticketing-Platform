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
  const maxNumber = seats.reduce((max, seat) => Math.max(max, seat.number), 0);

  return (
    <div className="overflow-x-auto">
      <div className="flex flex-col items-center gap-1.5 mb-5 min-w-fit">
        <div className="screen-arc" />
        <span className="font-mono text-[9px] tracking-[0.35em] text-muted-2">TELA</span>
      </div>

      <div className="flex flex-col gap-1.5 min-w-fit mx-auto w-fit">
        {rows.map(([row, rowSeats]) => (
          <div key={row} className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] text-muted-2 w-3 text-right shrink-0">
              {row}
            </span>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${maxNumber}, 1.75rem)` }}
            >
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
                    style={{ gridColumn: seat.number }}
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

      <div className="flex items-center justify-center gap-4 flex-wrap mt-5 min-w-fit">
        <LegendItem swatchClassName="bg-surface-alt border border-line-soft" label="Livre" />
        <LegendItem swatchClassName="bg-amber" label="Selecionado" />
        <LegendItem
          swatchClassName="bg-transparent border border-line-soft/40"
          label="Ocupado"
        />
      </div>
    </div>
  );
}

function LegendItem({ swatchClassName, label }: { swatchClassName: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm shrink-0 ${swatchClassName}`} aria-hidden />
      <span className="font-mono text-[10px] tracking-wide text-muted-2">{label}</span>
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
    "w-7 h-7 rounded-sm text-[10px] font-mono flex items-center justify-center transition-all duration-150";

  if (selected) {
    return `${base} bg-amber text-amber-ink shadow-[0_0_10px_-1px_rgba(232,163,61,0.65)] scale-[1.05]`;
  }
  if (state === "SOLD") {
    return `${base} bg-transparent text-muted-2/50 border border-line-soft/40 cursor-not-allowed`;
  }
  if (state === "HELD") {
    return `${base} bg-surface-alt text-muted-2 border border-amber-dim/30 opacity-70 cursor-not-allowed`;
  }
  return `${base} bg-surface-alt text-muted border border-line-soft hover:border-amber-dim hover:text-ink focus-visible:border-amber`;
}
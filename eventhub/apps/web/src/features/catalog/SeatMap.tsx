import type { Seat } from "@eventhub/contracts";

interface SeatMapProps {
  seats: Seat[];
  selectedIds: ReadonlySet<string>;
  conflictIds: ReadonlySet<string>;
  onToggleSeat: (seatId: string) => void;
}

export function SeatMap({
  seats,
  selectedIds,
  conflictIds,
  onToggleSeat,
}: SeatMapProps) {
  if (seats.length === 0) {
    return (
      <section className="state state--empty">
        <p>Для цієї події схема залу не передбачена.</p>
      </section>
    );
  }

  const rows = new Map<string, Seat[]>();
  for (const seat of seats) {
    const list = rows.get(seat.rowLabel) ?? [];
    list.push(seat);
    rows.set(seat.rowLabel, list);
  }

  return (
    <div>
      <div className="seat-stage" aria-hidden="true">
        Сцена
      </div>

      <div className="seat-map" role="group" aria-label="Карта місць у залі">
        {[...rows.entries()].map(([rowLabel, rowSeats]) => (
          <div key={rowLabel} className="seat-row">
            <span className="seat-row__label">{rowLabel}</span>
            <div className="seat-row__seats">
              {rowSeats.map((seat) => {
                const isSelected = selectedIds.has(seat.id);
                const isConflict = conflictIds.has(seat.id);
                const priceUah = (seat.price.amount / 100).toFixed(0);
                const classNames = [
                  "seat",
                  isSelected ? "seat--selected" : "",
                  isConflict ? "seat--conflict" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={seat.id}
                    type="button"
                    className={classNames}
                    disabled={!seat.available}
                    aria-pressed={isSelected}
                    title={`Ряд ${seat.rowLabel}, місце ${seat.number} — ${priceUah} грн`}
                    aria-label={`Ряд ${seat.rowLabel}, місце ${seat.number}, ${priceUah} грн${!seat.available ? " (зайнято)" : ""}`}
                    onClick={() => onToggleSeat(seat.id)}
                  >
                    {seat.number}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="seat-legend">
        <span className="seat-legend__item">
          <span className="seat-legend__swatch" /> Вільне
        </span>
        <span className="seat-legend__item">
          <span className="seat-legend__swatch seat-legend__swatch--selected" />{" "}
          Обране
        </span>
        <span className="seat-legend__item">
          <span className="seat-legend__swatch seat-legend__swatch--taken" />{" "}
          Зайняте
        </span>
        {conflictIds.size > 0 && (
          <span className="seat-legend__item">
            <span className="seat-legend__swatch seat-legend__swatch--conflict" />{" "}
            Щойно зайняли
          </span>
        )}
      </div>
    </div>
  );
}


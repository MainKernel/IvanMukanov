import { useEffect, useState } from "react";
import type { Event } from "@eventhub/contracts";
import { api } from "../../api/client";

/**
 * Стан компонента — дискримінантне об'єднання (див. розділ 9.5 методички).
 *
 * Одна змінна замість пари events/problem робить неможливими стани
 * на кшталт «помилка й дані одночасно», а «завантаження» і «порожньо»
 * перестають виглядати однаково. Компілятор не дасть звернутися
 * до state.events, поки тип не звужено перевіркою state.kind === "ready".
 */
type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; events: Event[] };

export function EventList() {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    // openapi-fetch не кидає винятків на HTTP-помилках.
    // Замість цього повертає { data } АБО { error } — і TypeScript
    // не дасть звернутись до data, поки ви не перевірили error.
    // Це і є "помилки як частина контракту" з лекції.
    api
      .GET("/events", { params: { query: { limit: 20 } } })
      .then(({ data, error }) => {
        if (error) {
          // error має тип Problem — той самий, що описаний у специфікації
          setState({ kind: "error", message: error.title });
          return;
        }
        setState({ kind: "ready", events: data.items });
      })
      .catch(() => {
        // Мережева помилка (мок-сервер не запущений, CORS тощо) —
        // HTTP-відповіді немає взагалі, тож і Problem немає.
        setState({ kind: "error", message: "Не вдалося з'єднатися з API" });
      });
  }, []);

  if (state.kind === "loading") return <p aria-busy="true">Завантаження…</p>;

  if (state.kind === "error") return <p role="alert">{state.message}</p>;

  if (state.events.length === 0) {
    return (
      <section className="placeholder">
        <h2>Подій поки немає</h2>
        <p>Зазирніть пізніше — організатори постійно додають нові.</p>
      </section>
    );
  }

  return (
    <ul className="event-list">
      {state.events.map((e) => (
        <li key={e.id}>
          <strong>{e.title}</strong> — {e.venue.city},{" "}
          {new Date(e.startsAt).toLocaleString("uk-UA")}
          {" · від "}
          {/* amount у копійках — ділимо на 100 лише для показу.
              У розрахунках копійки НІКОЛИ не перетворюються
              на дробові гривні. */}
          {(e.minPrice.amount / 100).toFixed(2)} грн
        </li>
      ))}
    </ul>
  );
}


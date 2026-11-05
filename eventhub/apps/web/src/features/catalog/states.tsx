import { titleOf } from "../../api/queries";

/**
 * Три «нестандартні» стани екрана. Четвертий — дані — малює сам список.
 */

/** Завантаження — скелетон, що повторює структуру майбутніх карток. */
export function EventListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="event-list" aria-busy="true" aria-label="Завантаження подій">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="event-card event-card--skeleton">
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line" />
          <span className="skeleton skeleton--line skeleton--short" />
        </li>
      ))}
    </ul>
  );
}

/** Помилка — текст із problem+json (поле title) і повторна спроба. */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <section className="state state--error" role="alert">
      <h2>{titleOf(error)}</h2>
      <p>Перевірте з'єднання та спробуйте ще раз.</p>
      <button type="button" className="button" onClick={onRetry}>
        Спробувати ще раз
      </button>
    </section>
  );
}

/**
 * Порожньо — не помилка: система відпрацювала правильно, просто під фільтр
 * нічого не підпало. Кнопка скидання — лише коли фільтри справді застосовані.
 */
export function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <section className="state state--empty">
      {hasFilters ? (
        <>
          <h2>За цими фільтрами подій не знайдено</h2>
          <p>Спробуйте інше місто або іншу дату.</p>
          <button type="button" className="button" onClick={onReset}>
            Скинути фільтри
          </button>
        </>
      ) : (
        <>
          <h2>Подій поки немає</h2>
          <p>Зазирніть пізніше — організатори постійно додають нові.</p>
        </>
      )}
    </section>
  );
}


import { Link, useLocation } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Event } from "@eventhub/contracts";
import { fetchEvents } from "../../api/queries";
import { eventKeys } from "../../api/queryKeys";
import { useCatalogFilters } from "./useCatalogFilters";
import { Filters } from "./Filters";
import { EmptyState, ErrorState, EventListSkeleton } from "./states";
import { FavoriteButton } from "./favorites";

export function formatPrice(e: Event): string {
  // amount у копійках — ділимо на 100 лише для показу.
  // У розрахунках копійки НІКОЛИ не перетворюються на дробові гривні.
  return `${(e.minPrice.amount / 100).toFixed(2)} грн`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("uk-UA", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function EventList() {
  const { filters, setFilter, reset, isEmpty } = useCatalogFilters();
  // Передаємо поточні фільтри на сторінку події, щоб «До каталогу»
  // повертало на той самий відфільтрований екран.
  const { search } = useLocation();

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    // Фільтри — у ключі: кожен набір фільтрів має власний запис кеша.
    // Тому й гонки відповідей немає: стара відповідь ляже у свій запис,
    // який ніхто не показує.
    queryKey: eventKeys.list(filters),
    queryFn: ({ pageParam }) => fetchEvents(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    // Єдине місце, де фронтенд знає про курсор. Курсор непрозорий (ADR-0001) —
    // ніде не розбирається. null → undefined, інакше hasNextPage лишиться true.
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const content = (() => {
    if (isPending) return <EventListSkeleton />;
    if (isError)
      return <ErrorState error={error} onRetry={() => void refetch()} />;

    // data.pages — масив сторінок, а не подій: кеш зберігає структуру відповідей.
    const events = data.pages.flatMap((page) => page.items);
    if (events.length === 0)
      return <EmptyState hasFilters={!isEmpty} onReset={reset} />;

    return (
      <>
        <ul className="event-list">
          {events.map((e) => (
            <li key={e.id} className="event-card event-card--row">
              <Link
                to={`/events/${e.id}`}
                state={{ catalogSearch: search }}
                className="event-card__link"
              >
                <strong className="event-card__title">{e.title}</strong>
                <span className="event-card__meta">
                  {e.venue.city} · {e.venue.name}
                </span>
                <span className="event-card__meta">
                  {formatDate(e.startsAt)} · від {formatPrice(e)}
                </span>
              </Link>
              {/* Кнопка поза посиланням: інтерактивний елемент усередині <a> — невалідна розмітка. */}
              <FavoriteButton eventId={e.id} />
            </li>
          ))}
        </ul>

        {hasNextPage && (
          // disabled під час завантаження — інакше подвійний клік дасть два
          // запити на ту саму сторінку й дублі в списку.
          <button
            type="button"
            className="button load-more"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "Завантаження…" : "Показати ще"}
          </button>
        )}
      </>
    );
  })();

  return (
    <section>
      <Filters
        filters={filters}
        onChange={setFilter}
        onReset={reset}
        isEmpty={isEmpty}
      />
      {content}
    </section>
  );
}

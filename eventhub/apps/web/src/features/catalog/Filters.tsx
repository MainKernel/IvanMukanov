import type { CatalogFilters } from "../../api/queries";
import { SearchBox } from "./SearchBox";

const CITIES = ["Вінниця", "Львів", "Київ"] as const;

/**
 * Панель фільтрів. Власного стану не має: значення приходять з URL
 * (useCatalogFilters), зміни туди ж і йдуть.
 */
export function Filters({
  filters,
  onChange,
  onReset,
  isEmpty,
}: {
  filters: CatalogFilters;
  onChange: (
    key: keyof CatalogFilters,
    value: string | undefined,
    options?: { replace?: boolean },
  ) => void;
  onReset: () => void;
  isEmpty: boolean;
}) {
  return (
    <div className="filters">
      <SearchBox
        value={filters.q}
        onCommit={(q) => onChange("q", q, { replace: true })}
      />

      <div className="filters__group" role="group" aria-label="Місто">
        <button
          type="button"
          className="chip"
          aria-pressed={!filters.city}
          onClick={() => onChange("city", undefined)}
        >
          Усі міста
        </button>
        {CITIES.map((city) => (
          <button
            key={city}
            type="button"
            className="chip"
            aria-pressed={filters.city === city}
            onClick={() => onChange("city", city)}
          >
            {city}
          </button>
        ))}
      </div>

      <label className="filters__date">
        Від дати
        <input
          type="date"
          value={filters.from ?? ""}
          onChange={(e) => onChange("from", e.target.value || undefined)}
        />
      </label>

      {!isEmpty && (
        <button type="button" className="button button--ghost" onClick={onReset}>
          Скинути
        </button>
      )}
    </div>
  );
}


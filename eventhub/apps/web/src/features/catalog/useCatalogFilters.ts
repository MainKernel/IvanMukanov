import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { CatalogFilters } from "../../api/queries";

type FilterKey = keyof CatalogFilters;

/**
 * Фільтри каталогу живуть в URL, а не в useState.
 *
 * - посилання відтворює точно той самий екран;
 * - кнопка «назад» знімає фільтр — історія браузера безкоштовно;
 * - стан переживає перезавантаження;
 * - одне джерело правди: жодної синхронізації useState ↔ URL через useEffect.
 */
export function useCatalogFilters() {
  const [params, setParams] = useSearchParams();

  const filters: CatalogFilters = useMemo(
    () => ({
      city: params.get("city") ?? undefined,
      q: params.get("q") ?? undefined,
      from: params.get("from") ?? undefined,
    }),
    [params],
  );

  const setFilter = useCallback(
    (
      key: FilterKey,
      value: string | undefined,
      options?: { replace?: boolean },
    ) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        // replace — для пошуку: кожна пауза в наборі не повинна
        // створювати окремий запис в історії браузера.
        { replace: options?.replace ?? false },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => {
    setParams(new URLSearchParams());
  }, [setParams]);

  const isEmpty = !filters.city && !filters.q && !filters.from;

  return { filters, setFilter, reset, isEmpty };
}


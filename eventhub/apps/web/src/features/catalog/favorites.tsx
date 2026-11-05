import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FavoriteList } from "@eventhub/contracts";
import { fetchFavorites, setFavorite, titleOf } from "../../api/queries";
import { favoriteKeys } from "../../api/queryKeys";

/** Множина ідентифікаторів обраних подій. */
export function useFavorites() {
  return useQuery({
    queryKey: favoriteKeys.all,
    queryFn: fetchFavorites,
    select: (data) => new Set(data.eventIds),
  });
}

interface ToggleVars {
  eventId: string;
  on: boolean;
}

interface ToggleContext {
  previous: FavoriteList | undefined;
}

/**
 * Обране з оптимістичним оновленням (ДЗ ЛР №4).
 *
 * onMutate — до відповіді сервера: зупиняємо вхідні refetch, знімаємо
 *   знімок попереднього стану й одразу малюємо бажаний стан.
 * onError — сервер відмовив: відкочуємо кеш до знімка.
 * onSettled — за будь-якого результату звіряємося з сервером
 *   (інвалідація), бо правда завжди на сервері.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, ToggleVars, ToggleContext>({
    mutationFn: ({ eventId, on }) => setFavorite(eventId, on),

    onMutate: async ({ eventId, on }) => {
      // Інакше refetch, що вже летить, може прийти після нашого
      // оптимістичного запису й затерти його старими даними.
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all });

      const previous = queryClient.getQueryData<FavoriteList>(favoriteKeys.all);

      queryClient.setQueryData<FavoriteList>(favoriteKeys.all, (old) => {
        const ids = new Set(old?.eventIds ?? []);
        if (on) ids.add(eventId);
        else ids.delete(eventId);
        return { eventIds: [...ids] };
      });

      return { previous };
    },

    onError: (_error, _vars, context) => {
      // Відкат до знімка. undefined (кеш ще був порожній) — теж валідний знімок.
      queryClient.setQueryData(favoriteKeys.all, context?.previous);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: favoriteKeys.all }),
  });
}

/** Зірочка на картці / сторінці події. */
export function FavoriteButton({ eventId }: { eventId: string }) {
  const { data: favorites } = useFavorites();
  const toggle = useToggleFavorite();
  const isFavorite = favorites?.has(eventId) ?? false;

  return (
    <span className="favorite">
      <button
        type="button"
        className="favorite__button"
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Прибрати з обраного" : "Додати в обране"}
        title={isFavorite ? "Прибрати з обраного" : "Додати в обране"}
        onClick={() => toggle.mutate({ eventId, on: !isFavorite })}
      >
        {isFavorite ? "★" : "☆"}
      </button>
      {toggle.isError && (
        <span className="favorite__error" role="alert">
          {titleOf(toggle.error)}
        </span>
      )}
    </span>
  );
}


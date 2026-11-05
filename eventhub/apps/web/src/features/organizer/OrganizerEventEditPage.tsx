import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEvent, titleOf, updateOrganizerEvent } from "../../api/queries";
import { eventKeys, organizerKeys } from "../../api/queryKeys";

export function OrganizerEventEditPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: event, isPending, isError, error } = useQuery({
    queryKey: eventKeys.detail(eventId ?? ""),
    queryFn: () => fetchEvent(eventId!),
    enabled: Boolean(eventId),
  });

  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [minPriceCents, setMinPriceCents] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: {
      title?: string;
      description?: string;
      minPriceCents?: number;
    }) => updateOrganizerEvent(eventId!, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: eventKeys.all });
      void qc.invalidateQueries({ queryKey: organizerKeys.all });
      navigate("/organizer");
    },
  });

  if (isPending) {
    return (
      <div className="event-card event-card--skeleton event-page__card" aria-busy="true">
        <span className="skeleton skeleton--title" />
        <span className="skeleton skeleton--line" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <section className="state state--error" role="alert">
        <h2>{titleOf(error)}</h2>
        <Link to="/organizer" className="button">
          ← До списку подій організатора
        </Link>
      </section>
    );
  }

  const currentTitle = title ?? event.title;
  const currentDescription = description ?? event.description ?? "";
  const currentPrice = minPriceCents ?? String(event.minPrice.amount);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      title: currentTitle,
      description: currentDescription || undefined,
      minPriceCents: Number(currentPrice),
    });
  };

  return (
    <section className="event-page">
      <Link to="/organizer" className="button button--ghost">
        ← До списку подій організатора
      </Link>

      <article className="event-card event-page__card">
        <h2 className="event-page__title">Редагування події</h2>

        <form className="auth-form" onSubmit={onSubmit}>
          <label className="auth-form__field">
            <span>Назва події</span>
            <input
              type="text"
              required
              minLength={1}
              maxLength={200}
              value={currentTitle}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="auth-form__field">
            <span>Опис</span>
            <input
              type="text"
              maxLength={2000}
              value={currentDescription}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="auth-form__field">
            <span>Мінімальна ціна (у копійках)</span>
            <input
              type="number"
              required
              min={0}
              value={currentPrice}
              onChange={(e) => setMinPriceCents(e.target.value)}
            />
          </label>

          {mutation.isError && (
            <p className="auth-form__error" role="alert">
              {titleOf(mutation.error)}
            </p>
          )}

          <div className="me-actions">
            <button
              type="submit"
              className="button"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Збереження…" : "Зберегти"}
            </button>
          </div>
        </form>
      </article>
    </section>
  );
}


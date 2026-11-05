import { useEffect, useRef, useState } from "react";

/** Пауза в наборі, після якої пошуковий запит потрапляє в URL і в queryKey. */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * Поле пошуку за назвою з відкладеним оновленням ключа (ДЗ ЛР №4).
 *
 * ЧОМУ ЗАТРИМКА СТОЇТЬ ПЕРЕД ОНОВЛЕННЯМ КЛЮЧА, А НЕ ВСЕРЕДИНІ queryFn
 *
 * queryKey — це адреса запису в кеші. Якби ключ змінювався на кожну
 * літеру, а sleep() стояв усередині queryFn, то:
 *   1. на слово «джаз» у кеші з'явилося б чотири записи: «д», «дж», «джа»,
 *      «джаз». Кожен у стані pending, і кожен із них TanStack Query
 *      спробує виконати. Затримка нічого не економить: вона лише відкладає
 *      ті самі чотири запити;
 *   2. кожна літера перемикала б екран на новий порожній запис, тобто
 *      на скелетон. Список блимав би на кожне натискання;
 *   3. у URL і в історії браузера осідали б проміжні недописані рядки.
 *
 * Затримка ДО ключа означає, що ключ змінюється рідко, лише коли
 * користувач зробив паузу. Поки він друкує, ключ сталий: TanStack Query
 * не бачить жодної зміни, кеш не засмічується, а мережа мовчить.
 * Отже, відкладати треба рішення «що ми шукаємо», а не виконання запиту.
 *
 * Джерело правди — URL (`value` приходить з useCatalogFilters). Локальний
 * `text` лише буферизує набір, поки не минула пауза.
 */
export function SearchBox({
  value,
  onCommit,
}: {
  value: string | undefined;
  onCommit: (value: string | undefined) => void;
}) {
  const [text, setText] = useState(value ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // URL змінився ззовні («назад», «Скинути фільтри»): підлаштовуємо буфер
  // прямо під час рендеру, без useEffect. Потік однобічний (URL → text),
  // тому нескінченного циклу синхронізації бути не може.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value ?? "");
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const onChange = (next: string) => {
    setText(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onCommit(next.trim() || undefined);
    }, SEARCH_DEBOUNCE_MS);
  };

  return (
    <label className="search">
      <span className="visually-hidden">Пошук за назвою</span>
      <input
        type="search"
        placeholder="Пошук за назвою…"
        value={text}
        maxLength={100}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}


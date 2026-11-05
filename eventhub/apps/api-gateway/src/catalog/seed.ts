import type { Event } from "@eventhub/contracts";

/**
 * Функція порівняння для сортування за (startsAt ASC, id ASC),
 * як визначено в ADR-0001 (курсорна пагінація).
 */
export function byStartThenId(a: Event, b: Event): number {
  const timeCompare = a.startsAt.localeCompare(b.startsAt);
  if (timeCompare !== 0) {
    return timeCompare;
  }
  return a.id.localeCompare(b.id);
}

/**
 * Початкові події для каталогу (in-memory seed).
 * Містить:
 * - 2 події з однаковим startsAt ("2026-11-20T18:30:00.000Z") для перевірки вторинного ключа (id);
 * - 1 скасовану подію (cancelled: true) для перевірки бізнес-помилки 422 при створенні замовлення.
 */
export const EVENTS: Event[] = [
  {
    id: "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8e9f",
    title: "Симфонічний вечір",
    description:
      "Програма з творів Лисенка та Дворжака у виконанні академічного оркестру",
    startsAt: "2026-10-12T19:00:00.000Z",
    venue: {
      id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
      name: "Вінницька обласна філармонія",
      city: "Вінниця",
    },
    minPrice: {
      amount: 25000, // 250.00 грн
      currency: "UAH",
    },
    availableSeats: 143,
  },
  {
    id: "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8ea0",
    title: "Джазовий квартет: Осінній сет",
    description: "Вечір авторського джазу та класичних стандартів",
    startsAt: "2026-10-19T20:00:00.000Z",
    venue: {
      id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e01",
      name: "Клуб «Підвал»",
      city: "Вінниця",
    },
    minPrice: {
      amount: 18000, // 180.00 грн
      currency: "UAH",
    },
    availableSeats: 2,
  },
  // --- 2 події з однаковим startsAt для перевірки сортування / пагінації за id ---
  {
    id: "018f2c1e-5b8c-7d4e-8f2a-3b6c7d8e9f01",
    title: "IT StandUp: Реліз у п'ятницю",
    description: "Гумористичний вечір про розробку, дедлайни та легасі-код",
    startsAt: "2026-11-20T18:30:00.000Z",
    venue: {
      id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e02",
      name: "Креативний простір «Артинов»",
      city: "Вінниця",
    },
    minPrice: {
      amount: 30000, // 300.00 грн
      currency: "UAH",
    },
    availableSeats: 45,
  },
  {
    id: "018f2c1e-5b8c-7d4e-8f2a-3b6c7d8e9f02",
    title: "Благодійний акустичний концерт",
    description: "Акустичні виступи вінницьких інді-гуртів на підтримку збору",
    startsAt: "2026-11-20T18:30:00.000Z",
    venue: {
      id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e03",
      name: "Urban Stage",
      city: "Вінниця",
    },
    minPrice: {
      amount: 20000, // 200.00 грн
      currency: "UAH",
    },
    availableSeats: 80,
  },
  // --------------------------------------------------------------------------------
  {
    id: "018f2c1e-6c9d-7e5f-9a3b-4c7d8e9f0a03",
    title: "Театральна вистава «1984»",
    description: "Антиутопія Джорджа Орвелла у сучасній інтерпретації",
    startsAt: "2026-11-28T18:00:00.000Z",
    venue: {
      id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e04",
      name: "Театр ім. Садовського",
      city: "Вінниця",
    },
    minPrice: {
      amount: 35000, // 350.00 грн
      currency: "UAH",
    },
    availableSeats: 210,
  },
  {
    id: "018f2c1e-7d0e-7f6a-8b4c-5d8e9f0a1b04",
    title: "Нічний органно-електронний перформанс (Скасовано)",
    description: "Подію скасовано організатором з технічних причин",
    startsAt: "2026-12-05T21:00:00.000Z",
    venue: {
      id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
      name: "Вінницька обласна філармонія",
      city: "Вінниця",
    },
    minPrice: {
      amount: 40000,
      currency: "UAH",
    },
    availableSeats: 0,
    cancelled: true,
  },
];

export const SEED_EVENTS = EVENTS;

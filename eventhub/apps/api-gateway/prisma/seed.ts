import { PrismaClient, SeatStatus } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

/**
 * Генерує детермінований UUID на основі рядка-затравки.
 * Це гарантує стабільні ідентифікатори місць при повторних запусках (детермінованість).
 */
function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  const p1 = hash.substring(0, 8);
  const p2 = hash.substring(8, 12);
  const p3 = "7" + hash.substring(13, 16);
  const p4 = "8" + hash.substring(17, 20);
  const p5 = hash.substring(20, 32);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}

const VENUES = [
  {
    id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
    name: "Вінницька обласна філармонія",
    city: "Вінниця",
  },
  {
    id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e01",
    name: "Клуб «Підвал»",
    city: "Вінниця",
  },
  {
    id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e02",
    name: "Креативний простір «Артинов»",
    city: "Вінниця",
  },
  {
    id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e03",
    name: "Львівська національна опера",
    city: "Львів",
  },
  {
    id: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e04",
    name: "Театр ім. Садовського",
    city: "Вінниця",
  },
];

const EVENTS = [
  {
    id: "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8e9f",
    title: "Симфонічний вечір",
    description:
      "Програма з творів Лисенка та Дворжака у виконанні академічного оркестру",
    startsAt: new Date("2026-10-12T19:00:00.000Z"),
    minPriceCents: 25000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
  },
  // Дві події на 19.10 починаються в ту саму секунду — перевірка вторинного ключа у курсорі (ADR-0001)
  {
    id: "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8ea0",
    title: "Джазовий квартет: Осінній сет",
    description: "Вечір авторського джазу та класичних стандартів",
    startsAt: new Date("2026-10-19T20:00:00.000Z"),
    minPriceCents: 18000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e01",
  },
  {
    id: "018f2c1e-5b8c-7d4e-8f2a-3b6c7d8e9f01",
    title: "IT StandUp: Реліз у п'ятницю",
    description: "Гумористичний вечір про розробку, дедлайни та легасі-код",
    startsAt: new Date("2026-10-19T20:00:00.000Z"),
    minPriceCents: 30000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e02",
  },
  // 2 події у Львові (venueId ...8e03)
  {
    id: "018f2c1e-5b8c-7d4e-8f2a-3b6c7d8e9f02",
    title: "Благодійний акустичний концерт",
    description: "Акустичні виступи інді-гуртів на підтримку збору",
    startsAt: new Date("2026-11-20T18:30:00.000Z"),
    minPriceCents: 20000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e03",
  },
  {
    id: "018f2c1e-6c9d-7e5f-9a3b-4c7d8e9f0a03",
    title: "Театральна вистава «1984»",
    description: "Антиутопія Джорджа Орвелла у сучасній інтерпретації",
    startsAt: new Date("2026-11-28T18:00:00.000Z"),
    minPriceCents: 35000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e04",
  },
  {
    id: "018f2c1e-7d0e-7f6a-8b4c-5d8e9f0a1b04",
    title: "Нічний органно-електронний перформанс",
    description: "Поєднання класичного органного звучання з модульним синтезом",
    startsAt: new Date("2026-12-05T21:00:00.000Z"),
    minPriceCents: 40000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
  },
  {
    id: "018f2c1e-8e1f-707b-9c5d-6e9f0a1b2c05",
    title: "Вечір балету у Львові",
    description: "Класична та модерна хореографія у супроводі симфонічного оркестру",
    startsAt: new Date("2026-12-12T19:00:00.000Z"),
    minPriceCents: 22000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e03",
  },
  {
    id: "018f2c1e-9f20-718c-ad6e-7f0a1b2c3d06",
    title: "Різдвяний хоровий фестиваль",
    description: "Традиційні колядки та сучасні акапельні аранжування",
    startsAt: new Date("2026-12-24T17:00:00.000Z"),
    minPriceCents: 15000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
  },
  {
    id: "018f2c1e-a031-729d-be7f-801b2c3d4e07",
    title: "Новорічний стендап-марафон",
    description: "Підбиття підсумків року від провідних коміків",
    startsAt: new Date("2026-12-30T19:30:00.000Z"),
    minPriceCents: 35000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e02",
  },
  {
    id: "018f2c1e-b142-73ae-cf80-912c3d4e5f08",
    title: "Камерний вечір фортепіанної музики",
    description: "Шопен, Дебюссі та Равель при свічках",
    startsAt: new Date("2027-01-08T18:00:00.000Z"),
    minPriceCents: 28000,
    currency: "UAH",
    availableSeats: 80,
    venueId: "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
  },
];

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];

async function main() {
  console.log("Seeding venues...");
  for (const v of VENUES) {
    await prisma.venue.upsert({
      where: { id: v.id },
      update: v,
      create: v,
    });
  }

  console.log("Seeding events (10 events)...");
  for (const e of EVENTS) {
    await prisma.event.upsert({
      where: { id: e.id },
      update: e,
      create: e,
    });
  }

  console.log("Recreating seats (80 seats per event, 800 seats total)...");
  await prisma.seat.deleteMany({});

  const seatsData: Array<{
    id: string;
    eventId: string;
    rowLabel: string;
    number: number;
    priceCents: number;
    status: SeatStatus;
  }> = [];

  for (const event of EVENTS) {
    for (const rowLabel of ROWS) {
      for (let number = 1; number <= 10; number++) {
        let extra = 0;
        if (rowLabel === "A" || rowLabel === "B") {
          extra = 10000;
        } else if (rowLabel === "C" || rowLabel === "D") {
          extra = 5000;
        }

        seatsData.push({
          id: deterministicUuid(`${event.id}-${rowLabel}-${number}`),
          eventId: event.id,
          rowLabel,
          number,
          priceCents: event.minPriceCents + extra,
          status: SeatStatus.FREE,
        });
      }
    }
  }

  await prisma.seat.createMany({
    data: seatsData,
  });

  const venueCount = await prisma.venue.count();
  const eventCount = await prisma.event.count();
  const seatCount = await prisma.seat.count();

  console.log(
    `✓ Seed completed: ${venueCount} venues, ${eventCount} events, ${seatCount} seats.`,
  );
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

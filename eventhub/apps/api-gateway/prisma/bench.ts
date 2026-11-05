import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const SEED_EVENT_IDS = [
  "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8e9f",
  "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8ea0",
  "018f2c1e-5b8c-7d4e-8f2a-3b6c7d8e9f01",
  "018f2c1e-5b8c-7d4e-8f2a-3b6c7d8e9f02",
  "018f2c1e-6c9d-7e5f-9a3b-4c7d8e9f0a03",
  "018f2c1e-7d0e-7f6a-8b4c-5d8e9f0a1b04",
  "018f2c1e-8e1f-707b-9c5d-6e9f0a1b2c05",
  "018f2c1e-9f20-718c-ad6e-7f0a1b2c3d06",
  "018f2c1e-a031-729d-be7f-801b2c3d4e07",
  "018f2c1e-b142-73ae-cf80-912c3d4e5f08",
];

const VENUE_IDS = [
  "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e00",
  "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e01",
  "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e02",
  "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e03",
  "018f2c1e-0000-7c3d-9e1f-2a5b6c7d8e04",
];

const TOTAL = 100_000;
const BATCH_SIZE = 10_000;

async function main() {
  if (process.argv.includes("--clean")) {
    const deleted = await prisma.event.deleteMany({
      where: { id: { notIn: SEED_EVENT_IDS } },
    });
    const remaining = await prisma.event.count();
    console.log(
      `Видалено ${deleted.count} тестових подій. Залишилось у базі: ${remaining}`,
    );
    return;
  }

  const start = performance.now();
  const baseTime = new Date("2027-02-01T00:00:00.000Z").getTime();

  for (let offset = 0; offset < TOTAL; offset += BATCH_SIZE) {
    const batch = Array.from({ length: BATCH_SIZE }, (_, i) => {
      const idx = offset + i;
      return {
        id: randomUUID(),
        title: `Тестова подія #${idx + 1}`,
        description: `Бенчмарк подія №${idx + 1}`,
        startsAt: new Date(baseTime + idx * 60_000),
        minPriceCents: 15000 + (idx % 10) * 5000,
        currency: "UAH",
        availableSeats: 80,
        venueId: VENUE_IDS[idx % VENUE_IDS.length]!,
      };
    });

    await prisma.event.createMany({ data: batch });
    console.log(`Створено ${offset + BATCH_SIZE} з ${TOTAL}`);
  }

  const elapsed = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`Готово за ${elapsed} с`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


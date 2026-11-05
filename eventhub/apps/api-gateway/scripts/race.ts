import { PrismaClient } from "@prisma/client";
import type { AuthResponse, SeatMap } from "@eventhub/contracts";
import { config as loadDotenv } from "dotenv";

loadDotenv();

const API = process.env.API_URL ?? "http://127.0.0.1:3000";
const EVENT_ID = "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8e9f";
const CONCURRENCY = 50;

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const loginRes = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "student@example.com",
      password: "eventhub-demo-2026",
    }),
  });
  if (!loginRes.ok) {
    throw new Error(`Не вдалося увійти: HTTP ${loginRes.status}`);
  }
  const { accessToken: token } = (await loginRes.json()) as AuthResponse;

  const seatsRes = await fetch(`${API}/events/${EVENT_ID}/seats`);
  if (!seatsRes.ok) {
    throw new Error(`Не вдалося завантажити місця: HTTP ${seatsRes.status}`);
  }
  const seatMap = (await seatsRes.json()) as SeatMap;
  const targetSeat = seatMap.seats.find((s) => s.available);
  if (!targetSeat) {
    throw new Error("Немає жодного вільного місця. Виконайте db:reset перед тестом.");
  }

  console.log(`Подія:   ${EVENT_ID}`);
  console.log(`Місце:   ${targetSeat.rowLabel}-${targetSeat.number} (${targetSeat.id})`);
  console.log(`Потоків: ${CONCURRENCY}\n`);

  const body = JSON.stringify({
    eventId: EVENT_ID,
    seatIds: [targetSeat.id],
  });

  const started = performance.now();

  // TODO 1 – паралельний обстріл (створюємо масив обіцянок, потім чекаємо на всі).
  // Заголовок Idempotency-Key тут не надсилаємо: перевіряємо захист від гонки.
  const statuses = await Promise.all(
    Array.from({ length: CONCURRENCY }, () =>
      fetch(`${API}/orders`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body,
      })
        .then((r) => r.status)
        .catch(() => 0),
    ),
  );

  const elapsedMs = Math.round(performance.now() - started);

  // TODO 2 – підрахунок розподілу кодів відповіді.
  const distribution = new Map<number, number>();
  for (const status of statuses) {
    distribution.set(status, (distribution.get(status) ?? 0) + 1);
  }

  console.log("Розподіл кодів відповіді:");
  for (const [status, count] of [...distribution.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    console.log(`  ${status}: ${count}`);
  }
  console.log(`Час: ${elapsedMs} мс\n`);

  const created = distribution.get(201) ?? 0;
  const conflicts = distribution.get(409) ?? 0;
  const errors = statuses.filter((s) => s === 0 || s >= 500).length;

  const [seat, items] = await Promise.all([
    prisma.seat.findUnique({
      where: { id: targetSeat.id },
      select: { status: true },
    }),
    prisma.orderItem.count({
      where: { seatId: targetSeat.id },
    }),
  ]);

  const checks: [string, boolean, string][] = [
    ["рівно одне 201 Created", created === 1, `отримано ${created}`],
    [
      "решта – 409 Conflict",
      conflicts === CONCURRENCY - 1,
      `отримано ${conflicts}`,
    ],
    ["жодної помилки 5xx", errors === 0, `отримано ${errors}`],
    [
      "місце у стані HELD",
      seat?.status === "HELD",
      `стан у базі: ${seat?.status}`,
    ],
    [
      "місце в одному замовленні",
      items === 1,
      `записів у OrderItem: ${items}`,
    ],
  ];

  let allPassed = true;
  for (const [label, ok, detail] of checks) {
    if (ok) {
      console.log(`✔ ${label}`);
    } else {
      console.log(`✖ ${label} (${detail})`);
      allPassed = false;
    }
  }

  console.log(
    allPassed
      ? "\nГонку витримано: останній квиток продано один раз."
      : "\nПомилка конкурентності: перевірки не пройдено.",
  );

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


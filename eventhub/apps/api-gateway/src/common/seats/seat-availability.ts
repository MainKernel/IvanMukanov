import type { Prisma } from "@prisma/client";

/**
 * Місце доступне, якщо воно FREE або HELD із простроченим резервом.
 */
export function availableSeatWhere(now: Date): Prisma.SeatWhereInput {
  return {
    OR: [{ status: "FREE" }, { status: "HELD", holdExpiresAt: { lt: now } }],
  };
}


import { Injectable } from "@nestjs/common";
import { OrderStatus, type Prisma, SeatStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  EventNotFound,
  OrderNotFound,
  OrderStateConflict,
  SeatsUnavailable,
} from "../common/problem/domain-errors";
import { availableSeatWhere } from "../common/seats/seat-availability";

export const ORDER_INCLUDE = {
  event: { select: { title: true, currency: true } },
  items: {
    include: {
      seat: { select: { rowLabel: true, number: true } },
    },
    orderBy: [
      { seat: { rowLabel: "asc" as const } },
      { seat: { number: "asc" as const } },
    ],
  },
} satisfies Prisma.OrderInclude;

export type OrderRow = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

type Tx = Prisma.TransactionClient;

export interface CreateOrderInput {
  userId: string;
  eventId: string;
  seatIds: string[];
  holdMinutes: number;
  idempotencyKey: string | null;
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithHold(input: CreateOrderInput): Promise<OrderRow> {
    // Сортування прибирає цілий клас помилок – див. пояснення нижче.
    const seatIds = [...input.seatIds].sort();

    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const holdUntil = new Date(
          now.getTime() + input.holdMinutes * 60_000,
        );

        const event = await tx.event.findUnique({
          where: { id: input.eventId },
          select: { id: true },
        });
        if (!event) throw new EventNotFound(input.eventId);

        // Крок 0. Прибираємо прострочені резерви саме цієї події.
        await this.releaseExpired(tx, now, { eventId: input.eventId });

        // Крок 1. Резерв – одним атомарним UPDATE.
        const held = await tx.seat.updateMany({
          where: {
            id: { in: seatIds },
            eventId: input.eventId,
            status: SeatStatus.FREE,
          },
          data: {
            status: SeatStatus.HELD,
            holdExpiresAt: holdUntil,
          },
        });

        // Крок 2. Перевірка count – обов'язкова.
        if (held.count !== seatIds.length) {
          throw new SeatsUnavailable(
            await this.whichAreTaken(
              tx,
              seatIds,
              input.eventId,
              now,
              held.count > 0 ? holdUntil : undefined,
            ),
          );
        }

        // Крок 3. Ціни беремо з бази, а не з клієнта.
        const seats = await tx.seat.findMany({
          where: { id: { in: seatIds } },
          select: { id: true, priceCents: true, eventId: true },
        });
        const totalCents = seats.reduce((sum, s) => sum + s.priceCents, 0);

        // Крок 4. Лічильник – у тій самій транзакції.
        await tx.event.update({
          where: { id: input.eventId },
          data: { availableSeats: { decrement: seatIds.length } },
        });

        // Крок 5. Замовлення разом із позиціями – одним запитом.
        return tx.order.create({
          data: {
            userId: input.userId,
            eventId: input.eventId,
            status: OrderStatus.PENDING,
            totalCents,
            holdExpiresAt: holdUntil,
            idempotencyKey: input.idempotencyKey,
            items: {
              create: seats.map((s) => ({
                seatId: s.id,
                priceCents: s.priceCents,
              })),
            },
          },
          include: ORDER_INCLUDE,
        });
      },
      { timeout: 10_000, maxWait: 5_000 },
    );
  }

  async cancel(orderId: string, userId: string): Promise<OrderRow> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId }, // ← умова власника у WHERE
        select: {
          id: true,
          eventId: true,
          status: true,
          items: { select: { seatId: true } },
        },
      });
      if (!order) throw new OrderNotFound(orderId);

      const moved = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING }, // ← умова стану у WHERE
        data: { status: OrderStatus.CANCELLED },
      });

      if (moved.count === 0) {
        const fresh = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true },
        });
        throw new OrderStateConflict(fresh?.status ?? order.status);
      }

      await this.releaseSeats(
        tx,
        order.eventId,
        order.items.map((i) => i.seatId),
      );

      const updated = await tx.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });
      if (!updated) throw new OrderNotFound(orderId);
      return updated;
    });
  }

  async findByIdempotencyKey(key: string): Promise<OrderRow | null> {
    return this.prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: ORDER_INCLUDE,
    });
  }

  async findByIdForUser(
    orderId: string,
    userId: string,
  ): Promise<OrderRow | null> {
    return this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: ORDER_INCLUDE,
    });
  }

  async listByUser(userId: string): Promise<OrderRow[]> {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: ORDER_INCLUDE,
    });
  }

  async sweepExpired(batch: number): Promise<number> {
    return this.prisma.$transaction(
      (tx) => this.releaseExpired(tx, new Date(), { batch }),
      { timeout: 10_000, maxWait: 5_000 },
    );
  }

  private async releaseSeats(
    db: Tx,
    eventId: string,
    seatIds: string[],
  ): Promise<void> {
    if (seatIds.length === 0) return;
    const ordered = [...seatIds].sort();

    const released = await db.seat.updateMany({
      where: { id: { in: ordered }, status: SeatStatus.HELD },
      data: { status: SeatStatus.FREE, holdExpiresAt: null },
    });

    if (released.count > 0) {
      await db.event.update({
        where: { id: eventId },
        data: { availableSeats: { increment: released.count } },
      });
    }
  }

  private async releaseExpired(
    db: Tx,
    now: Date,
    scope: { eventId?: string; batch?: number } = {},
  ): Promise<number> {
    const stale = await db.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        holdExpiresAt: { lt: now },
        ...(scope.eventId ? { eventId: scope.eventId } : {}),
      },
      take: scope.batch ?? 100, // порціями
      orderBy: { holdExpiresAt: "asc" },
      select: { id: true, eventId: true, items: { select: { seatId: true } } },
    });

    let expired = 0;

    for (const order of stale) {
      const moved = await db.order.updateMany({
        where: { id: order.id, status: OrderStatus.PENDING }, // ← знову умова у WHERE
        data: { status: OrderStatus.EXPIRED },
      });
      if (moved.count === 0) continue; // ← і знову перевірка count

      await this.releaseSeats(
        db,
        order.eventId,
        order.items.map((i) => i.seatId),
      );
      expired += 1;
    }

    return expired;
  }

  private async whichAreTaken(
    db: Tx,
    seatIds: string[],
    eventId: string,
    now: Date,
    justHeldUntil?: Date,
  ): Promise<string[]> {
    const freeOrJustHeld = await db.seat.findMany({
      where: {
        id: { in: seatIds },
        eventId,
        OR: [
          availableSeatWhere(now),
          ...(justHeldUntil
            ? [{ status: SeatStatus.HELD, holdExpiresAt: justHeldUntil }]
            : []),
        ],
      },
      select: { id: true },
    });

    const freeSet = new Set(freeOrJustHeld.map((r) => r.id));
    const taken = seatIds.filter((id) => !freeSet.has(id));
    return taken.length > 0 ? taken : seatIds;
  }
}


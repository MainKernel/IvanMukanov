import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { CreateOrderBody, Order } from "@eventhub/contracts";
import type { AuthUser } from "../auth/current-user.decorator";
import { env } from "../common/config/env";
import {
  IdempotencyKeyReused,
  OrderNotFound,
} from "../common/problem/domain-errors";
import { OrdersRepository, type OrderRow } from "./orders.repository";

const UNIQUE_VIOLATION = "P2002";

function isUniqueViolationOn(err: unknown, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== UNIQUE_VIOLATION) return false;
  const target = err.meta?.["target"];
  return Array.isArray(target) ? target.includes(field) : target === field;
}

export function toOrder(row: OrderRow): Order {
  const currency = row.currency.trim() as "UAH";
  return {
    id: row.id,
    eventId: row.eventId,
    eventTitle: row.event.title,
    status: row.status,
    total: {
      amount: row.totalCents,
      currency,
    },
    holdExpiresAt: row.holdExpiresAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({
      seatId: item.seatId,
      rowLabel: item.seat.rowLabel,
      number: item.seat.number,
      price: {
        amount: item.priceCents,
        currency,
      },
    })),
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly repo: OrdersRepository) {}

  async create(
    user: AuthUser,
    body: CreateOrderBody,
    key: string | undefined,
  ): Promise<{ order: Order; replayed: boolean }> {
    if (!key) {
      const row = await this.repo.createWithHold({
        userId: user.id,
        eventId: body.eventId,
        seatIds: body.seatIds,
        holdMinutes: env.ORDER_HOLD_MINUTES,
        idempotencyKey: null,
      });
      return { order: toOrder(row), replayed: false };
    }

    // Швидкий шлях: ключ уже відомий (економія, а не захист від гонки).
    const known = await this.repo.findByIdempotencyKey(key);
    if (known) {
      return { order: this.replay(known, user, body), replayed: true };
    }

    try {
      const row = await this.repo.createWithHold({
        userId: user.id,
        eventId: body.eventId,
        seatIds: body.seatIds,
        holdMinutes: env.ORDER_HOLD_MINUTES,
        idempotencyKey: key,
      });
      return { order: toOrder(row), replayed: false };
    } catch (err) {
      if (!isUniqueViolationOn(err, "idempotencyKey")) throw err;

      const row = await this.repo.findByIdempotencyKey(key);
      if (!row) throw err;
      return { order: this.replay(row, user, body), replayed: true };
    }
  }

  async listMy(user: AuthUser): Promise<Order[]> {
    const rows = await this.repo.listByUser(user.id);
    return rows.map(toOrder);
  }

  async getOne(orderId: string, user: AuthUser): Promise<Order> {
    const row = await this.repo.findByIdForUser(orderId, user.id);
    if (!row) throw new OrderNotFound(orderId);
    return toOrder(row);
  }

  async cancel(orderId: string, user: AuthUser): Promise<Order> {
    const row = await this.repo.cancel(orderId, user.id);
    return toOrder(row);
  }

  private replay(row: OrderRow, user: AuthUser, body: CreateOrderBody): Order {
    // 1. Чужий ключ не повертає чуже замовлення
    if (row.userId !== user.id) throw new IdempotencyKeyReused();

    // 2. Той самий ключ з іншим тілом – 422
    const same =
      row.eventId === body.eventId &&
      row.items.length === body.seatIds.length &&
      [...row.items.map((i) => i.seatId)].sort().join() ===
        [...body.seatIds].sort().join();

    if (!same) throw new IdempotencyKeyReused();

    return toOrder(row);
  }
}

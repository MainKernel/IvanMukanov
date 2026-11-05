import { Injectable } from "@nestjs/common";
import { OrderStatus as PrismaOrderStatus, type Order as PrismaOrder } from "@prisma/client";
import type { Order } from "@eventhub/contracts";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateOrderData {
  userId: string;
  eventId: string;
  quantity: number;
  totalCents: number;
  currency: "UAH";
}

function toOrder(row: PrismaOrder): Order {
  return {
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    buyerId: row.userId,
    quantity: row.quantity,
    total: {
      amount: row.totalCents,
      currency: row.currency.trim() as "UAH",
    },
    status: row.status === PrismaOrderStatus.CANCELLED ? "cancelled" : "pending",
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderData): Promise<Order> {
    const row = await this.prisma.order.create({
      data: {
        userId: data.userId,
        eventId: data.eventId,
        quantity: data.quantity,
        totalCents: data.totalCents,
        currency: data.currency,
        status: PrismaOrderStatus.PENDING,
      },
    });
    return toOrder(row);
  }

  async byId(id: string): Promise<Order | undefined> {
    const row = await this.prisma.order.findUnique({ where: { id } });
    return row ? toOrder(row) : undefined;
  }

  async markCancelled(id: string): Promise<Order> {
    const row = await this.prisma.order.update({
      where: { id },
      data: { status: PrismaOrderStatus.CANCELLED },
    });
    return toOrder(row);
  }
}

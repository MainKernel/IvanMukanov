import { Injectable } from "@nestjs/common";
import type { Order } from "@eventhub/contracts";

const SEED_ORDERS: Order[] = [
  {
    id: "018f2c1e-7777-7c3d-9e1f-2a5b6c7d8e55",
    eventId: "018f2c1e-4a7b-7c3d-9e1f-2a5b6c7d8e9f",
    buyerId: "018f2c1e-9999-7c3d-9e1f-2a5b6c7d8e11",
    quantity: 2,
    total: { amount: 50000, currency: "UAH" },
    status: "pending",
    createdAt: "2026-10-01T12:00:00.000Z",
  },
];

@Injectable()
export class OrderRepository {
  private readonly orders = new Map<string, Order>(
    SEED_ORDERS.map((o) => [o.id, { ...o }]),
  );

  async save(order: Order): Promise<Order> {
    this.orders.set(order.id, order);
    return order;
  }

  async byId(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }
}


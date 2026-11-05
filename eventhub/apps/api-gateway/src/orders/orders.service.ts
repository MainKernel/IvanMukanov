import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { CreateOrderBody, Order } from "@eventhub/contracts";
import { CatalogService } from "../catalog/catalog.service";
import { OrderRepository } from "./order.repository";
import {
  EventCancelledError,
  ForbiddenOrderAccess,
  OrderAlreadyCancelled,
  OrderNotFound,
  SeatAlreadyHeld,
} from "../common/problem/domain-errors";

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepo: OrderRepository,
    private readonly catalog: CatalogService,
  ) {}

  async create(dto: CreateOrderBody): Promise<Order> {
    const event = await this.catalog.getOne(dto.eventId);

    if (event.cancelled) {
      throw new EventCancelledError(event.id);
    }

    if (dto.quantity > event.availableSeats) {
      throw new SeatAlreadyHeld(event.id, dto.quantity, event.availableSeats);
    }

    event.availableSeats -= dto.quantity;

    const order: Order = {
      id: randomUUID(),
      eventId: event.id,
      buyerId: dto.buyerId,
      quantity: dto.quantity,
      total: {
        amount: event.minPrice.amount * dto.quantity,
        currency: event.minPrice.currency,
      },
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    return this.ordersRepo.save(order);
  }

  async getOne(orderId: string): Promise<Order> {
    const order = await this.ordersRepo.byId(orderId);
    if (!order) {
      throw new OrderNotFound(orderId);
    }
    return order;
  }

  async cancel(orderId: string, buyerId: string): Promise<Order> {
    const order = await this.ordersRepo.byId(orderId);
    if (!order) {
      throw new OrderNotFound(orderId);
    }

    if (order.buyerId.toLowerCase() !== buyerId.toLowerCase()) {
      throw new ForbiddenOrderAccess(orderId);
    }

    if (order.status === "cancelled") {
      throw new OrderAlreadyCancelled(orderId);
    }

    const event = await this.catalog.getOne(order.eventId);
    event.availableSeats += order.quantity;

    const updated: Order = {
      ...order,
      status: "cancelled",
    };

    return this.ordersRepo.save(updated);
  }
}


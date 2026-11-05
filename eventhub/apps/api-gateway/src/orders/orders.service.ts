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

  async create(dto: CreateOrderBody, userId?: string): Promise<Order> {
    const event = await this.catalog.getOne(dto.eventId);

    if (event.cancelled) {
      throw new EventCancelledError(event.id);
    }

    if (dto.quantity > event.availableSeats) {
      throw new SeatAlreadyHeld(event.id, dto.quantity, event.availableSeats);
    }

    return this.ordersRepo.create({
      userId: userId ?? dto.buyerId,
      eventId: event.id,
      quantity: dto.quantity,
      totalCents: event.minPrice.amount * dto.quantity,
      currency: event.minPrice.currency,
    });
  }

  /**
   * ДЗ ЛР №5 (п. 2): Перегляд замовлення захищено JwtAuthGuard.
   * Якщо замовлення належить іншому користувачу — повертаємо 404 (OrderNotFound),
   * а не 403, щоб не розкривати сам факт існування чужого замовлення за ID.
   */
  async getOne(orderId: string, currentUserId: string): Promise<Order> {
    const order = await this.ordersRepo.byId(orderId);
    if (!order || order.userId.toLowerCase() !== currentUserId.toLowerCase()) {
      throw new OrderNotFound(orderId);
    }
    return order;
  }

  async cancel(orderId: string, buyerId: string): Promise<Order> {
    const order = await this.ordersRepo.byId(orderId);
    if (!order) {
      throw new OrderNotFound(orderId);
    }

    if (order.userId.toLowerCase() !== buyerId.toLowerCase()) {
      throw new ForbiddenOrderAccess(orderId);
    }

    if (order.status === "cancelled") {
      throw new OrderAlreadyCancelled(orderId);
    }

    return this.ordersRepo.markCancelled(orderId);
  }
}

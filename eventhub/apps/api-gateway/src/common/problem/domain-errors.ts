export interface ValidationErrorItem {
  field: string;
  code: string;
  message: string;
}

export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EventNotFound extends DomainError {
  constructor(readonly eventId: string) {
    super(`Подію ${eventId} не знайдено`);
  }
}

export class InvalidCursor extends DomainError {
  constructor(readonly raw: string) {
    super(`Некоректний курсор: "${raw}"`);
  }
}

export class RequestValidationFailed extends DomainError {
  constructor(readonly issues: ValidationErrorItem[]) {
    super("Некоректний параметр запиту");
  }
}

export class OrderNotFound extends DomainError {
  constructor(readonly orderId: string) {
    super(`Замовлення ${orderId} не знайдено`);
  }
}

export class SeatAlreadyHeld extends DomainError {
  constructor(
    readonly eventId: string,
    readonly requested: number,
    readonly available: number,
  ) {
    super(
      `Обрана кількість місць (${requested}) зараз недоступна через активне бронювання іншого покупця (залишилось: ${available}). Спробуйте через хвилину.`,
    );
  }
}

export class EventCancelledError extends DomainError {
  constructor(readonly eventId: string) {
    super(
      `Продаж квитків на подію ${eventId} припинено, оскільки організатор скасував подію`,
    );
  }
}

export class ForbiddenOrderAccess extends DomainError {
  constructor(readonly orderId: string) {
    super("Ви не можете скасувати замовлення іншого покупця");
  }
}

export class OrderAlreadyCancelled extends DomainError {
  constructor(readonly orderId: string) {
    super(`Замовлення ${orderId} вже перебуває у статусі cancelled`);
  }
}

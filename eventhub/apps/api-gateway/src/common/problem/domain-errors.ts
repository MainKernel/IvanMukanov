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

export class SeatsUnavailable extends DomainError {
  constructor(readonly seatIds: string[]) {
    super("Хтось випередив вас: ці місця вже зайняті");
  }
}

export class OrderStateConflict extends DomainError {
  constructor(readonly current: string) {
    super("Замовлення вже не очікує оплати");
  }
}

export class IdempotencyKeyReused extends DomainError {
  constructor() {
    super("Цей ключ ідемпотентності вже використано з іншим запитом");
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

export class FavoritesUnavailable extends DomainError {
  constructor() {
    super("Сервіс обраного тимчасово недоступний. Спробуйте ще раз.");
  }
}

export class EmailTaken extends DomainError {
  constructor() {
    super("Спробуйте увійти або вкажіть іншу адресу електронної пошти");
  }
}

export class InvalidCredentials extends DomainError {
  constructor() {
    super("Перевірте введену пошту та пароль");
  }
}

export class Unauthenticated extends DomainError {
  constructor() {
    super("Надайте дійсний Bearer-токен у заголовку Authorization");
  }
}

export class InvalidRefreshToken extends DomainError {
  constructor() {
    super("Увійдіть у систему заново");
  }
}

export class Forbidden extends DomainError {
  constructor() {
    super("Ваша роль не дозволяє виконати цю дію");
  }
}

export class VenueNotFound extends DomainError {
  constructor(readonly venueId: string) {
    super(`Майданчик ${venueId} не знайдено`);
  }
}

export class UserNotFound extends DomainError {
  constructor(readonly userId: string) {
    super(`Користувача ${userId} не знайдено`);
  }
}

export class GoogleAuthNotConfigured extends DomainError {
  constructor() {
    super("Вхід через Google не налаштовано на сервері (відсутні GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)");
  }
}

export class OAuthStateMismatch extends DomainError {
  constructor() {
    super("Сеанс входу через Google недійсний або було натиснуто «Скасувати»");
  }
}

export class OAuthEmailNotVerified extends DomainError {
  constructor() {
    super("Електронну пошту в обліковому записі Google не підтверджено");
  }
}

export class AccountExistsWithPassword extends DomainError {
  constructor() {
    super("Ця пошта вже зареєстрована з паролем. Увійдіть за паролем і прив'яжіть Google в особистому кабінеті");
  }
}

export class OAuthAccountAlreadyLinked extends DomainError {
  constructor() {
    super("Цей обліковий запис Google вже прив'язано до іншого користувача");
  }
}

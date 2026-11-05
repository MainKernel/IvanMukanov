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

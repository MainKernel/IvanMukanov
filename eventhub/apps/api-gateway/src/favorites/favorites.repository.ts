import { Injectable } from "@nestjs/common";

/**
 * Тимчасове сховище обраного в пам'яті процесу (ДЗ ЛР №4).
 *
 * Свідомий компроміс: до тижня 5 у системі немає користувача, тож обране
 * одне на весь застосунок і зникає після перезапуску. Інтерфейс репозиторію
 * не залежить від способу зберігання — заміна на таблицю Favorite(userId,
 * eventId) у Prisma не торкнеться ні сервісу, ні контролера.
 */
@Injectable()
export class FavoritesRepository {
  private readonly ids = new Set<string>();

  list(): string[] {
    return [...this.ids];
  }

  add(eventId: string): void {
    this.ids.add(eventId);
  }

  remove(eventId: string): void {
    this.ids.delete(eventId);
  }
}

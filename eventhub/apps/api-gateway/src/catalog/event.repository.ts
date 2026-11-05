import { Injectable } from "@nestjs/common";
import type { Event } from "@eventhub/contracts";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { VenueNotFound } from "../common/problem/domain-errors";

export interface FindParams {
  city?: string;
  q?: string;
  from?: string;
  after?: {
    startsAt: string;
    id: string;
  };
  limit: number;
}

export type OwnerScope = { organizerId: string } | undefined;

export interface CreateEventInput {
  title: string;
  description?: string;
  startsAt: Date;
  venueId: string;
  minPriceCents: number;
  availableSeats: number;
  organizerId: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  startsAt?: Date;
  venueId?: string;
  minPriceCents?: number;
  availableSeats?: number;
}

type EventRow = Prisma.EventGetPayload<{ include: { venue: true } }>;

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    startsAt: row.startsAt.toISOString(),
    venue: { id: row.venue.id, name: row.venue.name, city: row.venue.city },
    minPrice: {
      amount: row.minPriceCents,
      currency: row.currency.trim() as "UAH",
    },
    availableSeats: row.availableSeats,
  };
}

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(params: FindParams): Promise<Event[]> {
    const rows = await this.prisma.event.findMany({
      where: {
        ...(params.city
          ? { venue: { city: { equals: params.city, mode: "insensitive" } } }
          : {}),
        // Пошук за назвою (ДЗ ЛР №4): ILIKE '%q%' на боці бази.
        // На порядок сортування не впливає, тож курсор лишається коректним.
        ...(params.q
          ? { title: { contains: params.q, mode: "insensitive" } }
          : {}),
        ...(params.from
          ? { startsAt: { gte: new Date(`${params.from}T00:00:00Z`) } }
          : {}),
        ...(params.after
          ? {
              OR: [
                { startsAt: { gt: new Date(params.after.startsAt) } },
                {
                  startsAt: new Date(params.after.startsAt),
                  id: { gt: params.after.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      include: { venue: true },
    });
    return rows.map(toEvent);
  }

  async byId(id: string): Promise<Event | undefined> {
    const row = await this.prisma.event.findUnique({
      where: { id },
      include: { venue: true },
    });
    return row ? toEvent(row) : undefined;
  }

  async findByScope(scope: OwnerScope): Promise<Event[]> {
    const rows = await this.prisma.event.findMany({
      where: scope ? { organizerId: scope.organizerId } : {},
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      include: { venue: true },
    });
    return rows.map(toEvent);
  }

  async create(data: CreateEventInput): Promise<Event> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: data.venueId },
    });
    if (!venue) throw new VenueNotFound(data.venueId);

    const row = await this.prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startsAt: data.startsAt,
        venueId: data.venueId,
        minPriceCents: data.minPriceCents,
        availableSeats: data.availableSeats,
        organizerId: data.organizerId,
      },
      include: { venue: true },
    });
    return toEvent(row);
  }

  /**
   * Рівень 3 перевірки прав — умова в WHERE самого запиту (ЛР №6, п. 6.3).
   * Чужа подія для бази просто не існує: count === 0 дає 404 у сервісі.
   */
  async update(
    eventId: string,
    scope: OwnerScope,
    data: UpdateEventInput,
  ): Promise<number> {
    if (data.venueId) {
      const venue = await this.prisma.venue.findUnique({
        where: { id: data.venueId },
      });
      if (!venue) throw new VenueNotFound(data.venueId);
    }

    const { count } = await this.prisma.event.updateMany({
      where: scope
        ? { id: eventId, organizerId: scope.organizerId }
        : { id: eventId },
      data,
    });
    return count;
  }
}

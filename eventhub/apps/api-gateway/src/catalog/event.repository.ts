import { Injectable } from "@nestjs/common";
import type { Event } from "@eventhub/contracts";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface FindParams {
  city?: string;
  from?: string;
  after?: {
    startsAt: string;
    id: string;
  };
  limit: number;
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
}

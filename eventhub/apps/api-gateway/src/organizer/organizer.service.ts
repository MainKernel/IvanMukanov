import { Injectable } from "@nestjs/common";
import { Role } from "@prisma/client";
import type {
  CreateEventBody,
  Event,
  OrganizerEventList,
  UpdateEventBody,
} from "@eventhub/contracts";
import type { AuthUser } from "../auth/current-user.decorator";
import {
  EventRepository,
  type OwnerScope,
} from "../catalog/event.repository";
import { EventNotFound } from "../common/problem/domain-errors";

/**
 * Хто що бачить — в одному місці (ЛР №6, п. 6.2).
 * undefined — без обмеження (ADMIN бачить усі 10 подій);
 * об'єкт — лише події цього організатора.
 */
function scopeFor(user: AuthUser): OwnerScope {
  return user.role === Role.ADMIN ? undefined : { organizerId: user.id };
}

@Injectable()
export class OrganizerService {
  constructor(private readonly repo: EventRepository) {}

  async list(user: AuthUser): Promise<OrganizerEventList> {
    const items = await this.repo.findByScope(scopeFor(user));
    return { items };
  }

  async create(user: AuthUser, body: CreateEventBody): Promise<Event> {
    return this.repo.create({
      title: body.title,
      description: body.description,
      startsAt: new Date(body.startsAt),
      venueId: body.venueId,
      minPriceCents: body.minPriceCents,
      availableSeats: body.availableSeats,
      organizerId: user.id, // ← з токена, не з body
    });
  }

  async update(
    user: AuthUser,
    eventId: string,
    body: UpdateEventBody,
  ): Promise<Event> {
    const count = await this.repo.update(eventId, scopeFor(user), {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.startsAt !== undefined
        ? { startsAt: new Date(body.startsAt) }
        : {}),
      ...(body.venueId !== undefined ? { venueId: body.venueId } : {}),
      ...(body.minPriceCents !== undefined
        ? { minPriceCents: body.minPriceCents }
        : {}),
      ...(body.availableSeats !== undefined
        ? { availableSeats: body.availableSeats }
        : {}),
    });

    if (count === 0) throw new EventNotFound(eventId);

    const updated = await this.repo.byId(eventId);
    if (!updated) throw new EventNotFound(eventId);
    return updated;
  }
}


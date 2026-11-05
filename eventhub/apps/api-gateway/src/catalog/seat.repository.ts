import { Injectable } from "@nestjs/common";
import type { Seat } from "@eventhub/contracts";
import { PrismaService } from "../prisma/prisma.service";
import { availableSeatWhere } from "../common/seats/seat-availability";

@Injectable()
export class SeatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEvent(eventId: string, now: Date = new Date()): Promise<Seat[]> {
    const [rows, availableRows] = await Promise.all([
      this.prisma.seat.findMany({
        where: { eventId },
        orderBy: [{ rowLabel: "asc" }, { number: "asc" }],
      }),
      this.prisma.seat.findMany({
        where: { eventId, ...availableSeatWhere(now) },
        select: { id: true },
      }),
    ]);

    const availableIds = new Set(availableRows.map((r) => r.id));

    return rows.map((row) => ({
      id: row.id,
      rowLabel: row.rowLabel,
      number: row.number,
      price: {
        amount: row.priceCents,
        currency: "UAH",
      },
      available: availableIds.has(row.id),
    }));
  }
}


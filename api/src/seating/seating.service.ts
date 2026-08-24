import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderItemStatus, OrderStatus, SectorKind } from '../prisma/client';

export type SeatState = 'FREE' | 'HELD' | 'SOLD';

@Injectable()
export class SeatingService {
  private readonly logger = new Logger(SeatingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Devolve ao estoque tudo que expirou sem pagamento.
   */
  async releaseExpired(): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING, expiresAt: { lt: now } },
      include: { items: true },
    });
    if (!expired.length) return 0;

    await this.prisma.$transaction(async (tx) => {
      for (const order of expired) {

        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: OrderStatus.PENDING },
          data: { status: OrderStatus.EXPIRED },
        });
        if (claimed.count === 0) continue;

        const perSector = new Map<string, number>();
        for (const item of order.items) {
          if (!item.seatId) {
            perSector.set(item.sectorId, (perSector.get(item.sectorId) ?? 0) + 1);
          }
        }
        for (const [sectorId, qty] of perSector) {
          await tx.sector.update({
            where: { id: sectorId },
            data: { sold: { decrement: qty } },
          });
        }

        await tx.seat.updateMany({
          where: { lockedByOrderId: order.id },
          data: { lockedByOrderId: null, lockedUntil: null },
        });

        await tx.orderItem.updateMany({
          where: { orderId: order.id },
          data: { status: OrderItemStatus.RELEASED },
        });
      }
    });

    this.logger.log(`${expired.length} reserva(s) expirada(s) devolvida(s) ao estoque.`);
    return expired.length;
  }

  /** Mapa de assentos e saldo de pista de um evento. */
  async availability(eventId: string) {
    await this.releaseExpired();

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        sectors: {
          include: {
            seats: {
              orderBy: [{ row: 'asc' }, { number: 'asc' }],
              include: {
                items: {
                  where: { status: OrderItemStatus.CONFIRMED },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Evento nao encontrado.');

    const now = new Date();

    return {
      eventId: event.id,
      sectors: event.sectors.map((sector) => {
        if (sector.kind === SectorKind.GENERAL) {
          return {
            id: sector.id,
            name: sector.name,
            kind: sector.kind,
            priceCents: sector.priceCents,
            capacity: sector.capacity,
            sold: sector.sold,
            available: Math.max((sector.capacity ?? 0) - sector.sold, 0),
          };
        }

        return {
          id: sector.id,
          name: sector.name,
          kind: sector.kind,
          priceCents: sector.priceCents,
          seats: sector.seats.map((seat) => ({
            id: seat.id,
            row: seat.row,
            number: seat.number,
            state: this.seatState(seat.items.length > 0, seat.lockedUntil, now),
          })),
          available: sector.seats.filter(
            (s) => this.seatState(s.items.length > 0, s.lockedUntil, now) === 'FREE',
          ).length,
        };
      }),
    };
  }

  private seatState(sold: boolean, lockedUntil: Date | null, now: Date): SeatState {
    if (sold) return 'SOLD';
    if (lockedUntil && lockedUntil > now) return 'HELD';
    return 'FREE';
  }
}
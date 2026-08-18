import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SeatingService } from '../seating/seating.service';
import {
  EventStatus,
  OrderItemStatus,
  OrderStatus,
  Prisma,
  SectorKind,
} from '../prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';

const HOLD_MINUTES = 10;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private seating: SeatingService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    await this.seating.releaseExpired();

    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: { sectors: true },
    });
    if (!event) throw new NotFoundException('Evento nao encontrado.');
    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Evento nao esta a venda.');
    }
    if (event.startsAt < new Date()) {
      throw new BadRequestException('Evento ja aconteceu.');
    }

    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { customerId, eventId: event.id, expiresAt, totalCents: 0 },
      });

      let total = 0;

      for (const input of dto.items) {
        const sector = event.sectors.find((s) => s.id === input.sectorId);
        if (!sector) throw new BadRequestException('Setor nao pertence ao evento.');

        if (sector.kind === SectorKind.SEATED) {
          if (!input.seatIds?.length) {
            throw new BadRequestException(`Setor ${sector.name} exige escolha de lugar.`);
          }
          await this.holdSeats(tx, order.id, sector.id, input.seatIds, expiresAt);
          for (const seatId of input.seatIds) {
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                sectorId: sector.id,
                seatId,
                priceCents: sector.priceCents,
              },
            });
          }
          total += sector.priceCents * input.seatIds.length;
        } else {
          const qty = input.quantity;
          if (!qty) throw new BadRequestException(`Setor ${sector.name} exige quantidade.`);
          await this.holdGeneral(tx, sector.id, qty);
          for (let i = 0; i < qty; i++) {
            await tx.orderItem.create({
              data: { orderId: order.id, sectorId: sector.id, priceCents: sector.priceCents },
            });
          }
          total += sector.priceCents * qty;
        }
      }

      return tx.order.update({
        where: { id: order.id },
        data: { totalCents: total },
        include: { items: { include: { seat: true, sector: true } }, event: true },
      });
    });
  }

  /**
   * Lugar marcado: trava as linhas dos assentos e so entao decide.
   *
   * O SELECT ... FOR UPDATE serializa duas reservas concorrentes sobre o
   * mesmo assento: a segunda espera a primeira terminar e enxerga o lock
   * ja gravado. Sem isso, as duas leriam "livre" ao mesmo tempo.
   *
   * Os ids vao ORDENADOS de proposito. Se duas transacoes travam os mesmos
   * assentos em ordens diferentes, o Postgres detecta deadlock e mata uma
   * delas. Ordem unica global elimina o ciclo.
   */
  private async holdSeats(
    tx: Prisma.TransactionClient,
    orderId: string,
    sectorId: string,
    seatIds: string[],
    expiresAt: Date,
  ) {
    const ids = [...new Set(seatIds)].sort();

    const locked = await tx.$queryRaw<{ id: string; lockedUntil: Date | null }[]>`
      SELECT s."id", s."lockedUntil"
      FROM "Seat" s
      WHERE s."id" IN (${Prisma.join(ids)}) AND s."sectorId" = ${sectorId}
      ORDER BY s."id"
      FOR UPDATE
    `;

    if (locked.length !== ids.length) {
      throw new BadRequestException('Algum lugar nao existe neste setor.');
    }

    const now = new Date();
    const held = locked.filter((s) => s.lockedUntil && s.lockedUntil > now);
    if (held.length) {
      throw new ConflictException('Alguem acabou de reservar esse lugar. Escolha outro.');
    }

    const sold = await tx.orderItem.count({
      where: { seatId: { in: ids }, status: OrderItemStatus.CONFIRMED },
    });
    if (sold > 0) {
      throw new ConflictException('Esse lugar ja foi vendido.');
    }

    await tx.seat.updateMany({
      where: { id: { in: ids } },
      data: { lockedByOrderId: orderId, lockedUntil: expiresAt },
    });
  }

  /**
   * Pista: um unico UPDATE condicional resolve.
   *
   * A condicao `sold + qty <= capacity` e avaliada pelo proprio Postgres
   * dentro do comando, entao nao existe janela entre ler e escrever.
   * Se o UPDATE nao afetar linha nenhuma, e porque nao cabia.
   */
  private async holdGeneral(tx: Prisma.TransactionClient, sectorId: string, qty: number) {
    const affected = await tx.$executeRaw`
      UPDATE "Sector"
      SET "sold" = "sold" + ${qty}
      WHERE "id" = ${sectorId}
        AND "kind" = 'GENERAL'
        AND "sold" + ${qty} <= "capacity"
    `;
    if (affected === 0) {
      throw new ConflictException('Nao ha ingressos suficientes nesse setor.');
    }
  }

  async findMine(customerId: string) {
    await this.seating.releaseExpired();
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { event: true, items: { include: { seat: true, sector: true } } },
    });
  }

  async findOne(customerId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { event: true, items: { include: { seat: true, sector: true } } },
    });
    if (!order) throw new NotFoundException('Reserva nao encontrada.');
    if (order.customerId !== customerId) throw new ForbiddenException();
    return order;
  }

  /** Cancelar reserva pendente devolve tudo ao estoque na hora. */
  async cancel(customerId: string, orderId: string) {
    const order = await this.findOne(customerId, orderId);
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('So reservas pendentes podem ser canceladas.');
    }

    return this.prisma.$transaction(async (tx) => {
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
      return tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }
}
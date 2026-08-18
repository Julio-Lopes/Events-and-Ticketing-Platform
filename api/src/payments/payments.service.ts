import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { SeatingService } from '../seating/seating.service';
import { OrderItemStatus, OrderStatus } from '../prisma/client';
import { PayDto } from './dto/pay.dto';

/**
 * Cartoes de teste. Deterministicos de proposito: quem avalia precisa
 * conseguir provocar a recusa sem adivinhar. Estao documentados no README.
 */
const DECLINE_RULES: { suffix: string; reason: string }[] = [
  { suffix: '0000', reason: 'Saldo insuficiente.' },
  { suffix: '0002', reason: 'Cartao bloqueado pelo emissor.' },
  { suffix: '0004', reason: 'Transacao recusada por suspeita de fraude.' },
];

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private tickets: TicketsService,
    private seating: SeatingService,
  ) {}

  async pay(customerId: string, orderId: string, dto: PayDto) {
    await this.seating.releaseExpired();

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Reserva nao encontrada.');
    if (order.customerId !== customerId) throw new ForbiddenException();

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Esta reserva ja foi paga.');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('Esta reserva expirou. Refaca a escolha dos lugares.');
    }
    if (order.expiresAt < new Date()) {
      throw new ConflictException('O tempo da reserva acabou. Refaca a escolha dos lugares.');
    }

    const decline = DECLINE_RULES.find((r) => dto.cardNumber.endsWith(r.suffix));
    const last4 = dto.cardNumber.slice(-4);

    if (decline) {
      /**
       * Recusa NAO cancela a reserva. O lugar continua segurado ate o fim
       * da janela, entao o cliente troca de cartao e tenta de novo sem
       * perder a poltrona. Devolver ao estoque na primeira recusa seria
       * punir o cliente por um erro do banco.
       */
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          amountCents: order.totalCents,
          approved: false,
          reason: decline.reason,
          cardLast4: last4,
        },
      });
      throw new BadRequestException({
        message: decline.reason,
        approved: false,
        retryUntil: order.expiresAt,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      /**
       * Reconfirma o estado dentro da transacao. Entre a checagem la em
       * cima e este ponto, outra requisicao pode ter pago o mesmo pedido.
       * O UPDATE condicional resolve: se nao afetar linha, alguem chegou antes.
       */
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.PENDING },
        data: { status: OrderStatus.PAID },
      });
      if (claimed.count === 0) {
        throw new ConflictException('Esta reserva ja foi processada.');
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          amountCents: order.totalCents,
          approved: true,
          cardLast4: last4,
        },
      });

      /**
       * HELD vira CONFIRMED. E aqui que o indice unico parcial entra em
       * acao: se por qualquer falha dois pedidos chegassem ao mesmo assento,
       * o banco recusa e a transacao inteira volta atras.
       */
      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: OrderItemStatus.CONFIRMED },
      });

      /** O lock deixa de fazer sentido: a posse agora e permanente. */
      await tx.seat.updateMany({
        where: { lockedByOrderId: order.id },
        data: { lockedByOrderId: null, lockedUntil: null },
      });

      await this.tickets.issueForOrder(tx, order.id, dto.holderName);

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          event: true,
          items: { include: { seat: true, sector: true, ticket: true } },
        },
      });
    });
  }
}
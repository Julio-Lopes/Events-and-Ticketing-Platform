import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TicketStatus } from '../prisma/client';
import { generateShareToken, generateTicketCode, signTicket } from './ticket-code';

@Injectable()
export class TicketsService {
  private readonly secret: string;
  private readonly appUrl: string;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('TICKET_SIGNING_SECRET');
    this.appUrl = config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  /**
   * Emite um ingresso por item pago. Roda dentro da transacao do pagamento:
   * ou o pedido vira PAID com todos os ingressos, ou nada acontece.
   */
  async issueForOrder(tx: Prisma.TransactionClient, orderId: string, holderName: string) {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      include: { order: { select: { eventId: true } } },
    });

    for (const item of items) {
      await tx.ticket.create({
        data: {
          orderItemId: item.id,
          eventId: item.order.eventId,
          code: generateTicketCode(),
          shareToken: generateShareToken(),
          holderName,
        },
      });
    }
  }

  async findMine(customerId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { orderItem: { order: { customerId } } },
      orderBy: { issuedAt: 'desc' },
      include: {
        event: true,
        orderItem: { include: { seat: true, sector: true } },
      },
    });
    return tickets.map((t) => this.present(t));
  }

  /** Link compartilhado: publico por definicao, quem tem o link ve o ingresso. */
  async findByShareToken(shareToken: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { shareToken },
      include: { event: true, orderItem: { include: { seat: true, sector: true } } },
    });
    if (!ticket) throw new NotFoundException('Ingresso nao encontrado.');
    return this.present(ticket);
  }

  /**
   * Gira o token do link. Compartilhar da acesso a entrada, entao quem
   * mandou o link para a pessoa errada precisa de um jeito de invalidar.
   */
  async rotateShareToken(customerId: string, ticketId: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, orderItem: { order: { customerId } } },
    });
    if (!ticket) throw new NotFoundException('Ingresso nao encontrado.');

    const updated = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { shareToken: generateShareToken() },
    });
    return { shareUrl: `${this.appUrl}/t/${updated.shareToken}` };
  }

  /**
   * O backend devolve o PAYLOAD do QR, nao a imagem. Renderizar o codigo
   * e trabalho do front, que ja precisa desenhar em tela; gerar PNG aqui
   * so gastaria banda e uma dependencia a mais.
   */
  private present(ticket: any) {
    const usable = ticket.status === TicketStatus.VALID;
    return {
      id: ticket.id,
      code: ticket.code,
      status: ticket.status,
      usedAt: ticket.usedAt,
      holderName: ticket.holderName,
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        venue: ticket.event.venue,
        city: ticket.event.city,
        startsAt: ticket.event.startsAt,
        imageUrl: ticket.event.imageUrl,
      },
      sector: ticket.orderItem.sector.name,
      seat: ticket.orderItem.seat
        ? `${ticket.orderItem.seat.row}${ticket.orderItem.seat.number}`
        : null,
      qrPayload: usable ? signTicket(ticket.id, this.secret) : null,
      shareUrl: `${this.appUrl}/t/${ticket.shareToken}`,
    };
  }
}
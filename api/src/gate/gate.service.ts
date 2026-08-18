import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus, TicketStatus } from '../prisma/client';
import { verifyTicketPayload } from '../tickets/ticket-code';
import { ValidateTicketDto } from './dto/validate-ticket.dto';

export type GateResult =
  | 'VALID'
  | 'INVALID'
  | 'ALREADY_USED'
  | 'WRONG_EVENT'
  | 'CANCELLED';

@Injectable()
export class GateService {
  private readonly logger = new Logger(GateService.name);
  private readonly secret: string;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('TICKET_SIGNING_SECRET');
  }

  /** Eventos que a portaria pode estar cobrindo hoje. */
  async shiftEvents() {
    const from = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return this.prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED, startsAt: { gte: from, lte: to } },
      orderBy: { startsAt: 'asc' },
      select: { id: true, title: true, venue: true, city: true, startsAt: true },
    });
  }

  async validate(gateUserId: string, dto: ValidateTicketDto) {
    const ticketId = await this.resolveTicketId(dto);
    if (!ticketId) return this.answer('INVALID');

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: { select: { id: true, title: true, startsAt: true } },
        orderItem: { include: { seat: true, sector: true } },
      },
    });
    if (!ticket) return this.answer('INVALID');

    /**
     * Evento errado antes de qualquer outra coisa. Um ingresso legitimo
     * da sessao de amanha nao pode ser marcado como usado hoje: se a
     * portaria errasse a ordem aqui, queimaria o ingresso do cliente.
     */
    if (ticket.eventId !== dto.eventId) {
      return this.answer('WRONG_EVENT', ticket);
    }
    if (ticket.status === TicketStatus.CANCELLED) {
      return this.answer('CANCELLED', ticket);
    }

    /**
     * O coracao da portaria: um unico UPDATE condicional.
     *
     * Ler o status e depois gravar deixaria uma janela em que duas
     * leituras simultaneas do mesmo QR passariam as duas. Aqui o proprio
     * Postgres decide: quem afetar a linha entrou, quem afetar zero
     * linhas chegou depois. Idempotente por construcao, inclusive contra
     * o duplo clique do operador.
     */
    const claimed = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: TicketStatus.VALID },
      data: { status: TicketStatus.USED, usedAt: new Date(), validatedById: gateUserId },
    });

    if (claimed.count === 0) {
      const current = await this.prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: {
          event: { select: { id: true, title: true, startsAt: true } },
          orderItem: { include: { seat: true, sector: true } },
        },
      });
      return this.answer('ALREADY_USED', current);
    }

    this.logger.log(`Ingresso ${ticket.code} validado no evento ${ticket.eventId}.`);
    return this.answer('VALID', ticket);
  }

  /**
   * QR e codigo digitado chegam ao mesmo lugar por caminhos diferentes.
   * O QR passa pela verificacao de assinatura; o codigo digitado nao tem
   * assinatura, e por isso e longo e de alfabeto restrito.
   */
  private async resolveTicketId(dto: ValidateTicketDto): Promise<string | null> {
    if (dto.payload) {
      return verifyTicketPayload(dto.payload.trim(), this.secret);
    }
    if (!dto.code) return null;

    const normalized = dto.code.trim().toUpperCase();
    const found = await this.prisma.ticket.findUnique({
      where: { code: normalized },
      select: { id: true },
    });
    return found?.id ?? null;
  }

  /**
   * Sempre HTTP 200, com o desfecho no corpo.
   *
   * Os quatro resultados nao sao erros da requisicao: sao respostas
   * legitimas que a tela precisa desenhar de formas diferentes. Devolver
   * 404 ou 409 obrigaria o front a ler mensagem de erro para saber que
   * cor pintar, o que e fragil.
   */
  private answer(result: GateResult, ticket?: any) {
    return {
      result,
      ticket: ticket
        ? {
            code: ticket.code,
            holderName: ticket.holderName,
            usedAt: ticket.usedAt,
            eventTitle: ticket.event.title,
            sector: ticket.orderItem.sector.name,
            seat: ticket.orderItem.seat
              ? `${ticket.orderItem.seat.row}${ticket.orderItem.seat.number}`
              : null,
          }
        : null,
    };
  }
}
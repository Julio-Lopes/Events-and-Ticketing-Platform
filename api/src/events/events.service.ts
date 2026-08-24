import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import {
  CatalogSource,
  EventStatus,
  OrderStatus,
  Prisma,
  SectorKind,
} from '../prisma/client';
import { CreateEventDto, SectorInput } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';

const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private catalog: CatalogService,
  ) {}

  // -------------------------------------------------------------- publico

  /** Vitrine: so PUBLISHED e so o que ainda nao comecou. */
  async listPublished(filters: ListEventsDto) {
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      startsAt: {
        gte: filters.from ? new Date(filters.from) : new Date(),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      },
      ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: 'insensitive' } },
              { venue: { contains: filters.q, mode: 'insensitive' } },
              { city: { contains: filters.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { startsAt: 'asc' },
        take: filters.take ?? 20,
        skip: filters.skip ?? 0,
        include: { sectors: { select: { name: true, kind: true, priceCents: true } } },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      total,
      items: items.map((e) => ({
        ...e,
        priceFromCents: e.sectors.length
          ? Math.min(...e.sectors.map((s) => s.priceCents))
          : null,
      })),
    };
  }

  async findPublished(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, status: EventStatus.PUBLISHED },
      include: { sectors: true },
    });
    if (!event) throw new NotFoundException('Evento nao encontrado.');
    return event;
  }

  // --------------------------------------------------------- organizador

  listMine(organizerId: string) {
    return this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { startsAt: 'asc' },
      include: {
        sectors: true,
        _count: { select: { orders: true, tickets: true } },
      },
    });
  }

  async create(organizerId: string, dto: CreateEventDto) {
    dto.sectors.forEach((s) => this.assertSectorShape(s));
    this.assertUniqueNames(dto.sectors);

    if (new Date(dto.startsAt) < new Date()) {
      throw new BadRequestException('A data do evento precisa ser no futuro.');
    }

    /**
     * Se veio do catalogo, os dados externos servem de PADRAO, nunca de
     * verdade: o que o organizador digitou vence. Ele pode querer um
     * titulo em portugues, um poster proprio, uma sinopse resumida.
     */
    let defaults = { title: dto.title, synopsis: dto.synopsis, imageUrl: dto.imageUrl };
    if (dto.source && dto.source !== CatalogSource.MANUAL && dto.externalId) {
      const item = await this.catalog.getById(dto.source, dto.externalId);
      if (item) {
        defaults = {
          title: dto.title || item.title,
          synopsis: dto.synopsis ?? item.synopsis ?? undefined,
          imageUrl: dto.imageUrl ?? item.imageUrl ?? undefined,
        };
      }
    }

    return this.prisma.event.create({
      data: {
        organizerId,
        title: defaults.title,
        synopsis: defaults.synopsis,
        imageUrl: defaults.imageUrl,
        source: dto.source ?? CatalogSource.MANUAL,
        externalId: dto.externalId,
        venue: dto.venue,
        city: dto.city,
        startsAt: new Date(dto.startsAt),
        doorsAt: dto.doorsAt ? new Date(dto.doorsAt) : null,
        status: EventStatus.DRAFT,
        sectors: { create: dto.sectors.map((s) => this.buildSector(s)) },
      },
      include: { sectors: true },
    });
  }

  async update(organizerId: string, id: string, dto: UpdateEventDto) {
    const event = await this.owned(organizerId, id);

    /**
     * Depois de vender, mudar a DATA do evento nao e edicao, e outra
     * historia: envolve avisar quem comprou e permitir reembolso. Fora
     * do escopo, entao a API recusa em vez de fingir que resolveu.
     */
    if (dto.startsAt && (await this.hasSales(id))) {
      throw new ConflictException(
        'Este evento ja tem ingressos vendidos. A data nao pode mudar por aqui.',
      );
    }

    return this.prisma.event.update({
      where: { id: event.id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        doorsAt: dto.doorsAt ? new Date(dto.doorsAt) : undefined,
      },
      include: { sectors: true },
    });
  }

  async publish(organizerId: string, id: string) {
    const event = await this.owned(organizerId, id);
    if (event.status === EventStatus.PUBLISHED) return event;
    if (event.startsAt < new Date()) {
      throw new BadRequestException('Nao da para publicar um evento que ja passou.');
    }
    if (!event.sectors.length) {
      throw new BadRequestException('Publique com ao menos um setor.');
    }

    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.PUBLISHED },
      include: { sectors: true },
    });
  }

  /**
   * Despublicar tira da vitrine e nada mais. Ingressos ja vendidos
   * continuam validos na portaria: quem pagou tem direito de entrar,
   * independente de o organizador ter mudado de ideia sobre a divulgacao.
   */
  async unpublish(organizerId: string, id: string) {
    await this.owned(organizerId, id);
    return this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.DRAFT },
      include: { sectors: true },
    });
  }

  async remove(organizerId: string, id: string) {
    await this.owned(organizerId, id);
    if (await this.hasSales(id)) {
      throw new ConflictException(
        'Existem reservas neste evento. Despublique em vez de excluir.',
      );
    }
    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  // ------------------------------------------------------------- helpers

  private async owned(organizerId: string, id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { sectors: true },
    });
    if (!event) throw new NotFoundException('Evento nao encontrado.');
    if (event.organizerId !== organizerId) throw new ForbiddenException();
    return event;
  }

  private hasSales(eventId: string) {
    return this.prisma.order
      .count({ where: { eventId, status: { in: [OrderStatus.PAID, OrderStatus.PENDING] } } })
      .then((n) => n > 0);
  }

  private assertSectorShape(s: SectorInput) {
    if (s.kind === SectorKind.SEATED) {
      if (!s.rows || !s.seatsPerRow) {
        throw new BadRequestException(
          `Setor "${s.name}" e numerado: informe fileiras e lugares por fileira.`,
        );
      }
      if (s.capacity) {
        throw new BadRequestException(
          `Setor "${s.name}" e numerado: a capacidade vem do mapa, nao de um numero solto.`,
        );
      }
    } else {
      if (!s.capacity) {
        throw new BadRequestException(`Setor "${s.name}" e pista: informe a capacidade.`);
      }
      if (s.rows || s.seatsPerRow) {
        throw new BadRequestException(`Setor "${s.name}" e pista: nao tem fileiras.`);
      }
    }
  }

  private assertUniqueNames(sectors: SectorInput[]) {
    const names = sectors.map((s) => s.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new BadRequestException('Dois setores com o mesmo nome.');
    }
  }

  private buildSector(s: SectorInput) {
    if (s.kind === SectorKind.GENERAL) {
      return {
        name: s.name.trim(),
        kind: s.kind,
        priceCents: s.priceCents,
        capacity: s.capacity,
      };
    }

    const seats = Array.from({ length: s.rows! }).flatMap((_, r) =>
      Array.from({ length: s.seatsPerRow! }, (_, i) => ({
        row: ROW_LETTERS[r],
        number: i + 1,
      })),
    );

    return {
      name: s.name.trim(),
      kind: s.kind,
      priceCents: s.priceCents,
      seats: { create: seats },
    };
  }
}
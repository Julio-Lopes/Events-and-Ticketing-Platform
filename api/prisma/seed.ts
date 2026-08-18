import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import {
  CatalogSource,
  EventStatus,
  PrismaClient,
  Role,
  SectorKind,
} from '../src/generated/prisma/client';

// O seed roda fora do Nest, entao monta o adapter por conta propria.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SENHA_PADRAO = 'elite123';

function daysFromNow(days: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Gera as poltronas de um setor numerado: fileiras A..N, assentos 1..n. */
function seatGrid(rows: number, perRow: number) {
  const letters = 'ABCDEFGHIJKLMN'.split('');
  return letters.slice(0, rows).flatMap((row) =>
    Array.from({ length: perRow }, (_, i) => ({ row, number: i + 1 })),
  );
}

async function main() {
  /**
   * O seed e destrutivo de proposito. Rodar duas vezes tem que dar
   * o mesmo resultado, e upsert em grafo com assentos gerados ficaria
   * mais confuso do que limpar e recriar.
   */
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.sector.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(SENHA_PADRAO, 10);

  const organizador = await prisma.user.create({
    data: { name: 'Marina Alves', email: 'organizador@elite.dev', passwordHash, role: Role.ORGANIZER },
  });
  await prisma.user.createMany({
    data: [
      { name: 'Rafael Souza', email: 'cliente1@elite.dev', passwordHash, role: Role.CUSTOMER },
      { name: 'Bianca Lima', email: 'cliente2@elite.dev', passwordHash, role: Role.CUSTOMER },
      { name: 'Portaria Cine Marquise', email: 'portaria@elite.dev', passwordHash, role: Role.GATE },
    ],
  });

  // --- Evento 1: cinema, so lugar marcado -----------------------------------
  const cinema = await prisma.event.create({
    data: {
      organizerId: organizador.id,
      title: 'Duna: parte dois',
      synopsis: 'Paul Atreides se une aos Fremen para vingar sua familia.',
      imageUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      source: CatalogSource.TMDB,
      externalId: '693134',
      venue: 'Cine Marquise, sala 3',
      city: 'Belo Horizonte',
      startsAt: daysFromNow(5, 21),
      doorsAt: daysFromNow(5, 20, 30),
      status: EventStatus.PUBLISHED,
      sectors: {
        create: {
          name: 'Sala 3',
          kind: SectorKind.SEATED,
          priceCents: 3200,
          seats: { create: seatGrid(8, 12) },
        },
      },
    },
    include: { sectors: true },
  });

  // --- Evento 2: show com pista E camarote ----------------------------------
  // Existe para provar que os dois fluxos convivem no mesmo evento.
  const show = await prisma.event.create({
    data: {
      organizerId: organizador.id,
      title: 'Los Hermanos',
      synopsis: 'Turne de retomada da banda carioca.',
      imageUrl: null,
      source: CatalogSource.TICKETMASTER,
      externalId: 'G5vYZ9k7Wq2aB',
      venue: 'Arena Hall',
      city: 'Contagem',
      startsAt: daysFromNow(19, 20, 30),
      doorsAt: daysFromNow(19, 19),
      status: EventStatus.PUBLISHED,
      sectors: {
        create: [
          { name: 'Pista', kind: SectorKind.GENERAL, priceCents: 9000, capacity: 500, sold: 382 },
          {
            name: 'Camarote',
            kind: SectorKind.SEATED,
            priceCents: 18000,
            seats: { create: seatGrid(3, 10) },
          },
        ],
      },
    },
    include: { sectors: true },
  });

  // --- Evento 3: rascunho, para o painel do organizador nao nascer vazio -----
  await prisma.event.create({
    data: {
      organizerId: organizador.id,
      title: 'Hamlet',
      synopsis: 'Montagem da companhia municipal.',
      source: CatalogSource.MANUAL,
      venue: 'Teatro Municipal',
      city: 'Boa Esperanca',
      startsAt: daysFromNow(26, 19),
      status: EventStatus.DRAFT,
      sectors: {
        create: {
          name: 'Plateia',
          kind: SectorKind.SEATED,
          priceCents: 4500,
          seats: { create: seatGrid(6, 10) },
        },
      },
    },
  });

  const totalSeats = await prisma.seat.count();

  console.log('\nSeed concluido.');
  console.log(`  usuarios: 4   eventos: 3   assentos gerados: ${totalSeats}`);
  console.log(`  senha de todos: ${SENHA_PADRAO}\n`);
  console.log('  organizador@elite.dev  cria e gerencia eventos');
  console.log('  cliente1@elite.dev     compra ingressos');
  console.log('  cliente2@elite.dev     compra ingressos');
  console.log('  portaria@elite.dev     valida ingressos\n');
  console.log(`  cinema publicado: ${cinema.title} (${cinema.id})`);
  console.log(`  show publicado:   ${show.title} (${show.id})\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
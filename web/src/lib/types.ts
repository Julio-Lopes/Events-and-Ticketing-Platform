/**
 * Espelha os DTOs de resposta da API. Mantido a mao, sem geracao
 * automatica: o contrato e pequeno o suficiente para nao justificar
 * OpenAPI + codegen num projeto de 7 dias, e manter os tipos aqui,
 * lidos junto do fetch que os usa, facilita notar quando os dois
 * lados divergem.
 */

export type Role = "ORGANIZER" | "CUSTOMER" | "GATE";
export type SectorKind = "SEATED" | "GENERAL";
export type SeatState = "FREE" | "HELD" | "SOLD";
export type OrderStatus = "PENDING" | "PAID" | "DECLINED" | "EXPIRED" | "CANCELLED";
export type TicketStatus = "VALID" | "USED" | "CANCELLED";
export type GateResult = "VALID" | "INVALID" | "ALREADY_USED" | "WRONG_EVENT" | "CANCELLED";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/** Setor como aparece na LISTAGEM: so o que o card precisa. */
export interface EventSectorSummary {
  name: string;
  kind: SectorKind;
  priceCents: number;
}

/** Setor como aparece no DETALHE: a linha completa do banco. */
export interface EventSector {
  id: string;
  eventId: string;
  name: string;
  kind: SectorKind;
  priceCents: number;
  capacity: number | null;
  sold: number;
}

export interface EventSummary {
  id: string;
  title: string;
  synopsis: string | null;
  imageUrl: string | null;
  venue: string;
  city: string;
  startsAt: string;
  doorsAt: string | null;
  sectors: EventSectorSummary[];
  priceFromCents: number | null;
}

export interface EventDetail {
  id: string;
  title: string;
  synopsis: string | null;
  imageUrl: string | null;
  venue: string;
  city: string;
  startsAt: string;
  doorsAt: string | null;
  sectors: EventSector[];
}

export interface SeatInfo {
  id: string;
  row: string;
  number: number;
  state: SeatState;
}

export interface SectorAvailability {
  id: string;
  name: string;
  kind: SectorKind;
  priceCents: number;
  available: number;
  capacity?: number | null;
  sold?: number;
  seats?: SeatInfo[];
}

export interface EventAvailability {
  eventId: string;
  sectors: SectorAvailability[];
}

export interface OrderItem {
  id: string;
  sectorId: string;
  seatId: string | null;
  status: string;
  priceCents: number;
  seat: { row: string; number: number } | null;
  sector: { name: string };
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalCents: number;
  expiresAt: string;
  createdAt: string;
  event: EventSummary;
  items: OrderItem[];
}

export interface Ticket {
  id: string;
  code: string;
  status: TicketStatus;
  usedAt: string | null;
  holderName: string;
  event: {
    id: string;
    title: string;
    venue: string;
    city: string;
    startsAt: string;
    imageUrl: string | null;
  };
  sector: string;
  seat: string | null;
  qrPayload: string | null;
  shareUrl: string;
}

export interface GateResponse {
  result: GateResult;
  ticket: {
    code: string;
    holderName: string;
    usedAt: string | null;
    eventTitle: string;
    sector: string;
    seat: string | null;
  } | null;
}

/** Item do catalogo externo (TMDb ou Ticketmaster), usado so pelo organizador. */
export interface CatalogItem {
  source: "TMDB" | "TICKETMASTER" | "MANUAL";
  externalId: string;
  title: string;
  synopsis: string | null;
  imageUrl: string | null;
  suggestedStartsAt: string | null;
  suggestedVenue: string | null;
  suggestedCity: string | null;
}

export interface CatalogSearchResult {
  items: CatalogItem[];
  unavailable: string[];
}

/** Evento como aparece no painel do organizador: setor completo + contagens. */
export interface OrganizerEvent {
  id: string;
  title: string;
  synopsis: string | null;
  imageUrl: string | null;
  venue: string;
  city: string;
  startsAt: string;
  doorsAt: string | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  sectors: EventSector[];
  _count: { orders: number; tickets: number };
}
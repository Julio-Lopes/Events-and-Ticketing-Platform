import { CatalogSource } from '../prisma/client';

/**
 * Forma unica de item de catalogo, independente do provedor.
 *
 * A assimetria importante esta nos tres campos `suggested*`:
 * o TMDb devolve um FILME, que nao tem data nem local, entao o organizador
 * preenche. O Ticketmaster devolve um EVENTO, que ja vem com data e local,
 * entao da para pre-preencher o formulario. Modelar isso como opcional em
 * vez de criar duas interfaces mantem o modulo de eventos ignorante sobre
 * qual provedor respondeu.
 */
export interface CatalogItem {
  source: CatalogSource;
  externalId: string;
  title: string;
  synopsis: string | null;
  imageUrl: string | null;
  suggestedStartsAt: Date | null;
  suggestedVenue: string | null;
  suggestedCity: string | null;
}

export interface CatalogProvider {
  readonly source: CatalogSource;
  /** Se a chave nao estiver configurada, o provedor se declara indisponivel. */
  readonly available: boolean;
  search(query: string, limit: number): Promise<CatalogItem[]>;
  /** Destaques: filmes em cartaz ou eventos proximos. */
  featured(limit: number): Promise<CatalogItem[]>;
  getById(externalId: string): Promise<CatalogItem | null>;
}

export const CATALOG_PROVIDERS = Symbol('CATALOG_PROVIDERS');
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogSource } from '../../prisma/client';
import { MemoryCache } from '../../common/memory-cache';
import { CatalogItem, CatalogProvider } from '../catalog.types';

const BASE = 'https://app.ticketmaster.com/discovery/v2';

interface TmEvent {
  id: string;
  name: string;
  info?: string;
  description?: string;
  images?: { url: string; width: number; ratio?: string }[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  _embedded?: {
    venues?: { name?: string; city?: { name?: string } }[];
  };
}

@Injectable()
export class TicketmasterProvider implements CatalogProvider {
  readonly source = CatalogSource.TICKETMASTER;
  private readonly logger = new Logger(TicketmasterProvider.name);
  private readonly apiKey: string;
  private readonly cache = new MemoryCache<CatalogItem[]>(10 * 60 * 1000);

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('TICKETMASTER_API_KEY') ?? '';
  }

  get available() {
    return this.apiKey.length > 0;
  }

  async search(query: string, limit: number) {
    return this.cache.wrap(`search:${query}:${limit}`, async () => {
      const data = await this.call<{ _embedded?: { events?: TmEvent[] } }>('/events.json', {
        keyword: query,
        size: String(limit),
      });
      return (data._embedded?.events ?? []).map((e) => this.toItem(e));
    });
  }

  async featured(limit: number) {
    return this.cache.wrap(`featured:${limit}`, async () => {
      const data = await this.call<{ _embedded?: { events?: TmEvent[] } }>('/events.json', {
        size: String(limit),
        sort: 'date,asc',
      });
      return (data._embedded?.events ?? []).map((e) => this.toItem(e));
    });
  }

  async getById(externalId: string) {
    const cached = this.cache.get(`id:${externalId}`);
    if (cached) return cached[0] ?? null;
    try {
      const event = await this.call<TmEvent>(`/events/${externalId}.json`, {});
      const item = this.toItem(event);
      this.cache.set(`id:${externalId}`, [item]);
      return item;
    } catch {
      return null;
    }
  }

  private async call<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(BASE + path);
    url.searchParams.set('apikey', this.apiKey);
    url.searchParams.set('countryCode', 'BR');
    url.searchParams.set('locale', '*');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      this.logger.warn(`Ticketmaster respondeu ${res.status} em ${path}`);
      throw new Error(`Ticketmaster ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Evento ja vem com data e local, entao os `suggested*` sao preenchidos
   * e o formulario do organizador nasce pronto. Ele ainda pode sobrescrever:
   * o dado externo e sugestao, nunca verdade.
   */
  private toItem(e: TmEvent): CatalogItem {
    const venue = e._embedded?.venues?.[0];
    const start = e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? null;

    return {
      source: CatalogSource.TICKETMASTER,
      externalId: e.id,
      title: e.name,
      synopsis: (e.info ?? e.description)?.trim() || null,
      imageUrl: this.bestImage(e.images),
      suggestedStartsAt: start ? new Date(start) : null,
      suggestedVenue: venue?.name ?? null,
      suggestedCity: venue?.city?.name ?? null,
    };
  }

  /** A API devolve dezenas de recortes. Pega o mais largo em 16:9. */
  private bestImage(images?: TmEvent['images']): string | null {
    if (!images?.length) return null;
    const wide = images.filter((i) => i.ratio === '16_9');
    const pool = wide.length ? wide : images;
    return pool.reduce((a, b) => (a.width >= b.width ? a : b)).url;
  }
}
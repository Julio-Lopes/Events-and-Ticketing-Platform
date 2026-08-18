import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogSource } from '../../prisma/client';
import { MemoryCache } from '../../common/memory-cache';
import { CatalogItem, CatalogProvider } from '../catalog.types';

const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string | null;
  poster_path: string | null;
}

@Injectable()
export class TmdbProvider implements CatalogProvider {
  readonly source = CatalogSource.TMDB;
  private readonly logger = new Logger(TmdbProvider.name);
  private readonly apiKey: string;
  private readonly cache = new MemoryCache<CatalogItem[]>(5 * 60 * 1000);

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('TMDB_API_KEY') ?? '';
  }

  get available() {
    return this.apiKey.length > 0;
  }

  async search(query: string, limit: number) {
    return this.cache.wrap(`search:${query}:${limit}`, async () => {
      const data = await this.call<{ results: TmdbMovie[] }>('/search/movie', {
        query,
        include_adult: 'false',
      });
      return data.results.slice(0, limit).map((m) => this.toItem(m));
    });
  }

  async featured(limit: number) {
    return this.cache.wrap(`featured:${limit}`, async () => {
      const data = await this.call<{ results: TmdbMovie[] }>('/movie/now_playing', {
        region: 'BR',
      });
      return data.results.slice(0, limit).map((m) => this.toItem(m));
    });
  }

  async getById(externalId: string) {
    const cached = this.cache.get(`id:${externalId}`);
    if (cached) return cached[0] ?? null;
    try {
      const movie = await this.call<TmdbMovie>(`/movie/${externalId}`, {});
      const item = this.toItem(movie);
      this.cache.set(`id:${externalId}`, [item]);
      return item;
    } catch {
      return null;
    }
  }

  private async call<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(BASE + path);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('language', 'pt-BR');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      this.logger.warn(`TMDb respondeu ${res.status} em ${path}`);
      throw new Error(`TMDb ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Filme nao tem data nem local. Os campos `suggested*` ficam nulos
   * de proposito: o organizador e quem escolhe sessao e sala.
   */
  private toItem(m: TmdbMovie): CatalogItem {
    return {
      source: CatalogSource.TMDB,
      externalId: String(m.id),
      title: m.title,
      synopsis: m.overview?.trim() || null,
      imageUrl: m.poster_path ? IMG + m.poster_path : null,
      suggestedStartsAt: null,
      suggestedVenue: null,
      suggestedCity: null,
    };
  }
}
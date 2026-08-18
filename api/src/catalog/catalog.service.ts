import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { CatalogSource } from '../prisma/client';
import { CATALOG_PROVIDERS, CatalogItem, CatalogProvider } from './catalog.types';

export interface CatalogResult {
  items: CatalogItem[];
  /** Provedores que falharam ou nao estao configurados, para o front avisar. */
  unavailable: CatalogSource[];
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @Inject(CATALOG_PROVIDERS) private readonly providers: CatalogProvider[],
  ) {}

  search(query: string, limit = 10, source?: CatalogSource) {
    return this.fanOut(source, (p) => p.search(query, limit));
  }

  featured(limit = 10, source?: CatalogSource) {
    return this.fanOut(source, (p) => p.featured(limit));
  }

  async getById(source: CatalogSource, externalId: string) {
    const provider = this.providers.find((p) => p.source === source);
    if (!provider?.available) {
      throw new ServiceUnavailableException(`Provedor ${source} indisponivel.`);
    }
    return provider.getById(externalId);
  }

  /**
   * Consulta os provedores em paralelo e NAO deixa um derrubar o outro.
   *
   * Um provedor fora do ar e o caso normal, nao a excecao: chave nao
   * configurada, limite de requisicao estourado, API instavel. Devolver o
   * que deu certo e listar o que falhou e melhor do que um 500 que apaga
   * a tela inteira do organizador.
   */
  private async fanOut(
    source: CatalogSource | undefined,
    fn: (p: CatalogProvider) => Promise<CatalogItem[]>,
  ): Promise<CatalogResult> {
    const targets = this.providers.filter(
      (p) => (!source || p.source === source) && p.available,
    );
    const unavailable = this.providers
      .filter((p) => (!source || p.source === source) && !p.available)
      .map((p) => p.source);

    const settled = await Promise.allSettled(targets.map(fn));

    const items: CatalogItem[] = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        items.push(...r.value);
      } else {
        unavailable.push(targets[i].source);
        this.logger.warn(`${targets[i].source} falhou: ${r.reason}`);
      }
    });

    return { items, unavailable };
  }
}
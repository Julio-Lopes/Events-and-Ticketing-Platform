import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { CATALOG_PROVIDERS } from './catalog.types';
import { TmdbProvider } from './providers/tmdb.provider';
import { TicketmasterProvider } from './providers/ticketmaster.provider';

/**
 * Adicionar um terceiro provedor no futuro custa uma classe e uma linha
 * neste array. Nada fora deste modulo sabe que TMDb e Ticketmaster existem.
 */
@Module({
  controllers: [CatalogController],
  providers: [
    TmdbProvider,
    TicketmasterProvider,
    {
      provide: CATALOG_PROVIDERS,
      inject: [TmdbProvider, TicketmasterProvider],
      useFactory: (tmdb: TmdbProvider, tm: TicketmasterProvider) => [tmdb, tm],
    },
    CatalogService,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CatalogSource, Role } from '../prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CatalogService } from './catalog.service';

/**
 * Catalogo nao e vitrine publica: e a fonte a partir da qual o organizador
 * monta um evento. Quem navega pelo site ve Event, nao CatalogItem.
 */
@Controller('catalog')
@Roles(Role.ORGANIZER)
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('source') source?: CatalogSource,
  ) {
    if (!q?.trim()) return { items: [], unavailable: [] };
    return this.catalog.search(q.trim(), Math.min(limit, 25), source);
  }

  @Get('featured')
  featured(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('source') source?: CatalogSource,
  ) {
    return this.catalog.featured(Math.min(limit, 25), source);
  }

  @Get(':source/:externalId')
  getOne(@Param('source') source: CatalogSource, @Param('externalId') externalId: string) {
    return this.catalog.getById(source, externalId);
  }
}
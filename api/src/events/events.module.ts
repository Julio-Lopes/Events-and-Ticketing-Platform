import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [CatalogModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
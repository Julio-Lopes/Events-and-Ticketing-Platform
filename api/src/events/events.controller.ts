import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '../prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';

@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  // Vitrine publica. Rota fixa antes da dinamica, senao 'mine' cairia em ':id'.
  @Public()
  @Get()
  list(@Query() filters: ListEventsDto) {
    return this.events.listPublished(filters);
  }

  @Roles(Role.ORGANIZER)
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.events.listMine(user.id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.events.findPublished(id);
  }

  @Roles(Role.ORGANIZER)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEventDto) {
    return this.events.create(user.id, dto);
  }

  @Roles(Role.ORGANIZER)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.update(user.id, id, dto);
  }

  @Roles(Role.ORGANIZER)
  @Post(':id/publish')
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.publish(user.id, id);
  }

  @Roles(Role.ORGANIZER)
  @Post(':id/unpublish')
  unpublish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.unpublish(user.id, id);
  }

  @Roles(Role.ORGANIZER)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.events.remove(user.id, id);
  }
}
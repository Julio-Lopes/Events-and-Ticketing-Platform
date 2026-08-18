import { Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '../prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private tickets: TicketsService) {}

  @Roles(Role.CUSTOMER)
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.tickets.findMine(user.id);
  }

  @Roles(Role.CUSTOMER)
  @Post(':id/rotate-share')
  rotate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tickets.rotateShareToken(user.id, id);
  }

  @Public()
  @Get('shared/:shareToken')
  shared(@Param('shareToken') shareToken: string) {
    return this.tickets.findByShareToken(shareToken);
  }
}
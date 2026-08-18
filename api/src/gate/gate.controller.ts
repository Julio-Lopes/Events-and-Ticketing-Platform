import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Role } from '../prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { GateService } from './gate.service';
import { ValidateTicketDto } from './dto/validate-ticket.dto';

@Controller('gate')
@Roles(Role.GATE)
export class GateController {
  constructor(private gate: GateService) {}

  @Get('events')
  events() {
    return this.gate.shiftEvents();
  }

  @HttpCode(200)
  @Post('validate')
  validate(@CurrentUser() user: AuthUser, @Body() dto: ValidateTicketDto) {
    return this.gate.validate(user.id, dto);
  }
}
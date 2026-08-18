import { Body, Controller, Param, Post } from '@nestjs/common';
import { Role } from '../prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { PayDto } from './dto/pay.dto';

@Controller('orders/:orderId/payment')
@Roles(Role.CUSTOMER)
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Post()
  pay(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: PayDto,
  ) {
    return this.payments.pay(user.id, orderId, dto);
  }
}
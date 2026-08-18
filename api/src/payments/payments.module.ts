import { Module } from '@nestjs/common';
import { TicketsModule } from '../tickets/tickets.module';
import { SeatingModule } from '../seating/seating.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TicketsModule, SeatingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
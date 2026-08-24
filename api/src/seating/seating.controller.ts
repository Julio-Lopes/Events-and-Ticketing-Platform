import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { SeatingService } from './seating.service';

@Controller('events/:eventId')
export class SeatingController {
  constructor(private seating: SeatingService) {}

  @Public()
  @Get('availability')
  availability(@Param('eventId') eventId: string) {
    return this.seating.availability(eventId);
  }
}
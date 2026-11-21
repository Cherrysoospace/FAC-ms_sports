import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TICKET_CAPACITY_PORT } from '../common/contracts';
import { Ticket } from './entities/ticket.entity';
import { TicketsRepository } from './repositories/tickets.repository';

/**
 * Submódulo liviano que expone la consulta de ocupación de boletos sin crear
 * dependencias circulares entre `locations` y `tickets`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Ticket])],
  providers: [
    TicketsRepository,
    {
      provide: TICKET_CAPACITY_PORT,
      useExisting: TicketsRepository,
    },
  ],
  exports: [TicketsRepository, TICKET_CAPACITY_PORT],
})
export class TicketCapacityModule {}

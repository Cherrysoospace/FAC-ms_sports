import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { VenuesModule } from '../venues/venues.module';
import { TicketCapacityModule } from '../tickets/ticket-capacity.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './repositories/locations.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Location]),
    VenuesModule,
    TicketCapacityModule,
  ],
  controllers: [LocationsController],
  providers: [LocationsService, LocationsRepository],
  exports: [LocationsService, LocationsRepository],
})
export class LocationsModule {}

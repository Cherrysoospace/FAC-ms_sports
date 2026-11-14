import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { VenuesModule } from '../venues/venues.module';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { LocationsRepository } from './repositories/locations.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Location]), VenuesModule],
  controllers: [LocationsController],
  providers: [LocationsService, LocationsRepository],
  // Lo usará el módulo de Boleto (getLocationOrFail).
  exports: [LocationsService],
})
export class LocationsModule {}

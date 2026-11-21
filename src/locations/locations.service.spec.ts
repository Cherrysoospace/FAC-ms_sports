import type { Repository } from 'typeorm';
import type { ITicketCapacityPort } from '../common/contracts';
import { BusinessRuleException } from '../common/exceptions';
import type { VenuesService } from '../venues/venues.service';
import { Location } from './entities/location.entity';
import { LocationsService } from './locations.service';
import type { LocationsRepository } from './repositories/locations.repository';

function createLocation(overrides: Partial<Location> = {}): Location {
  return Object.assign(new Location(), {
    id: 7,
    name: 'Tribuna Norte',
    capacity: 100,
    active: true,
    venue: { id: 3, name: 'Estadio Central' },
    ...overrides,
  });
}

describe('LocationsService (control de aforo y borrado con boletos)', () => {
  let service: LocationsService;
  const locationRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (entity: Location) => entity),
    remove: jest.fn(async () => undefined),
  };
  const locationsRepository = {
    findByFilters: jest.fn(),
    findByVenueAndName: jest.fn(async () => null),
  };
  const venuesService = {
    getVenueOrFail: jest.fn(),
  };
  const ticketCapacityPort: jest.Mocked<ITicketCapacityPort> = {
    countByLocationId: jest.fn(async () => 0),
    maxSoldPerMatchByLocationId: jest.fn(async () => 0),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocationsService(
      locationRepository as unknown as Repository<Location>,
      locationsRepository as unknown as LocationsRepository,
      venuesService as unknown as VenuesService,
      ticketCapacityPort,
    );
  });

  describe('update', () => {
    it('rechaza con 409 al intentar reducir capacity por debajo de boletos vendidos en un partido', async () => {
      locationRepository.findOne.mockResolvedValueOnce(
        createLocation({ capacity: 100 }),
      );
      ticketCapacityPort.maxSoldPerMatchByLocationId.mockResolvedValueOnce(80);

      await expect(service.update(7, { capacity: 60 })).rejects.toThrow(
        BusinessRuleException,
      );
      expect(locationRepository.save).not.toHaveBeenCalled();
    });

    it('permite ajustar capacity cuando es mayor o igual al máximo vendido por partido', async () => {
      const current = createLocation({ capacity: 100 });
      const updated = createLocation({ capacity: 80 });
      locationRepository.findOne
        .mockResolvedValueOnce(current)
        .mockResolvedValueOnce(updated);
      ticketCapacityPort.maxSoldPerMatchByLocationId.mockResolvedValueOnce(80);

      const result = await service.update(7, { capacity: 80 });

      expect(locationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ capacity: 80 }),
      );
      expect(result.capacity).toBe(80);
    });
  });

  describe('remove', () => {
    it('rechaza con 409 cuando la localidad tiene boletos vendidos asociados', async () => {
      locationRepository.findOne.mockResolvedValueOnce(createLocation());
      ticketCapacityPort.countByLocationId.mockResolvedValueOnce(15);

      await expect(service.remove(7)).rejects.toThrow('15 boletos vendidos');
      expect(locationRepository.remove).not.toHaveBeenCalled();
    });

    it('elimina la localidad cuando no tiene boletos asociados', async () => {
      const location = createLocation({ id: 7 });
      locationRepository.findOne.mockResolvedValueOnce(location);
      ticketCapacityPort.countByLocationId.mockResolvedValueOnce(0);

      await expect(service.remove(7)).resolves.toEqual({
        message: 'Localidad #7 eliminada correctamente',
      });
      expect(locationRepository.remove).toHaveBeenCalledWith(location);
    });
  });
});

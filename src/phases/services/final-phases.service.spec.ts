import type { Repository } from 'typeorm';
import type { FinalPhase } from '../entities/final-phase.entity';
import { FinalRound } from '../enums/final-round.enum';
import { TournamentStatus } from '../../tournaments/enums/tournament-status.enum';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
} from '../../common/exceptions';
import { FinalPhasesService } from './final-phases.service';
import type { PhasesRepository } from '../repositories/phases.repository';
import type { PhaseRulesService } from './phase-rules.service';
import type { TournamentsService } from '../../tournaments/tournaments.service';

const TOURNAMENT = {
  id: 10,
  name: 'Copa Caldas',
  status: TournamentStatus.REGISTRATION_OPEN,
  startDate: '2027-01-10',
  endDate: '2027-02-28',
};

const finalPhase = (id: number, round: FinalRound, order: number) =>
  ({
    id,
    round,
    order,
    name: round,
    tournament: TOURNAMENT,
  }) as unknown as FinalPhase;

const dto = (round: FinalRound, order: number) => ({
  tournamentId: 10,
  name: 'Fase',
  order,
  round,
});

describe('FinalPhasesService', () => {
  const finalPhaseRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (entity: FinalPhase) =>
      Object.assign(entity, { id: 50 }),
    ),
    remove: jest.fn(async () => undefined),
  };
  const phasesRepository = {
    findFinalByRound: jest.fn(),
    findFinalsByTournament: jest.fn(),
    findMaxGroupOrder: jest.fn(),
    countMatches: jest.fn(async () => 0),
  };
  const phaseRules = {
    assertTournamentEditable: jest.fn(),
    assertOrderType: jest.fn(async () => undefined),
    assertDatesInsideTournament: jest.fn(),
    assertNoMatches: jest.fn(async () => undefined),
  };
  const tournamentsService = {
    getTournamentOrFail: jest.fn(async () => TOURNAMENT),
  };

  let service: FinalPhasesService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Torneo con grupos hasta el orden 1 y sin fases finales.
    phasesRepository.findFinalByRound.mockResolvedValue(null);
    phasesRepository.findFinalsByTournament.mockResolvedValue([]);
    phasesRepository.findMaxGroupOrder.mockResolvedValue(1);
    phaseRules.assertNoMatches.mockResolvedValue(undefined);
    finalPhaseRepository.findOne.mockImplementation(async () =>
      finalPhase(50, FinalRound.FINAL, 2),
    );
    service = new FinalPhasesService(
      finalPhaseRepository as unknown as Repository<FinalPhase>,
      phasesRepository as unknown as PhasesRepository,
      phaseRules as unknown as PhaseRulesService,
      tournamentsService as unknown as TournamentsService,
    );
  });

  describe('create', () => {
    it('crea la final después de los grupos', async () => {
      const result = await service.create(dto(FinalRound.FINAL, 2));

      expect(finalPhaseRepository.save).toHaveBeenCalledTimes(1);
      expect(result.round).toBe(FinalRound.FINAL);
      expect(phaseRules.assertTournamentEditable).toHaveBeenCalledWith(
        TOURNAMENT,
      );
      expect(phaseRules.assertDatesInsideTournament).toHaveBeenCalled();
    });

    it('ronda repetida: 409 ALREADY_EXISTS', async () => {
      phasesRepository.findFinalByRound.mockResolvedValue(
        finalPhase(7, FinalRound.FINAL, 3),
      );

      const error = await service
        .create(dto(FinalRound.FINAL, 2))
        .catch((e: unknown) => e);

      expect((error as ApplicationException).errorCase).toBe(
        ErrorCase.ALREADY_EXISTS,
      );
      expect((error as Error).message).toBe(
        'El torneo ya tiene una fase FINAL',
      );
      expect(finalPhaseRepository.save).not.toHaveBeenCalled();
    });

    it('orden que no queda después de los grupos: 400 con el rango permitido', async () => {
      await expect(
        service.create(dto(FinalRound.SEMI_FINAL, 1)),
      ).rejects.toThrow(
        'El orden 1 no es válido para SEMI_FINAL. Rango permitido: 2 o mayor (después de los grupos (orden 1))',
      );
    });

    it('semifinal después de la final ya creada: 400', async () => {
      phasesRepository.findFinalsByTournament.mockResolvedValue([
        finalPhase(7, FinalRound.FINAL, 3),
      ]);

      await expect(
        service.create(dto(FinalRound.SEMI_FINAL, 4)),
      ).rejects.toThrow(
        'El orden 4 no es válido para SEMI_FINAL. Rango permitido: de 2 a 2 (después de los grupos (orden 1) y antes de FINAL (orden 3))',
      );
    });

    it('tercer puesto y final pueden compartir orden', async () => {
      phasesRepository.findFinalsByTournament.mockResolvedValue([
        finalPhase(7, FinalRound.THIRD_PLACE, 3),
      ]);

      await expect(
        service.create(dto(FinalRound.FINAL, 3)),
      ).resolves.toBeDefined();
    });

    it('torneo cerrado: propaga la regla y no guarda', async () => {
      phaseRules.assertTournamentEditable.mockImplementationOnce(() => {
        throw new BusinessRuleException(
          'El torneo Copa Caldas está finalizado',
        );
      });

      await expect(service.create(dto(FinalRound.FINAL, 2))).rejects.toThrow(
        'El torneo Copa Caldas está finalizado',
      );
      expect(finalPhaseRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('fase inexistente: 404', async () => {
      finalPhaseRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(
        'Fase final con id 99 no existe',
      );
    });

    it('con partidos: no se elimina', async () => {
      phaseRules.assertNoMatches.mockRejectedValue(
        new BusinessRuleException(
          'No se puede eliminar la fase final FINAL: tiene 1 partido',
        ),
      );

      await expect(service.remove(50)).rejects.toThrow(BusinessRuleException);
      expect(finalPhaseRepository.remove).not.toHaveBeenCalled();
    });

    it('sin información asociada: se elimina', async () => {
      await expect(service.remove(50)).resolves.toEqual({
        message: 'Fase final #50 eliminada correctamente',
      });
      expect(finalPhaseRepository.remove).toHaveBeenCalledTimes(1);
    });
  });
});

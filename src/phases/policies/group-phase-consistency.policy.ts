import type { GroupPhase } from '../entities/group-phase.entity';
import type { UpdateGroupPhaseDto } from '../dto/update-group-phase.dto';
import { ApplicationException, ErrorCase } from '../../common/exceptions';

// Datos que comparten todos los grupos de una misma fase (torneo + order).
export interface SharedPhaseValues {
  name: string;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Coherencia de la "fase de grupos": los grupos con el mismo torneo y order
 * forman una sola fase y deben compartir nombre y fechas. Decide qué valores
 * aplicar; quien persiste (y abre la transacción) es GroupPhasesService.
 */
export class GroupPhaseConsistencyPolicy {
  static sharedValuesOf(group: GroupPhase): SharedPhaseValues {
    return {
      name: group.name,
      startDate: group.startDate ?? null,
      endDate: group.endDate ?? null,
    };
  }

  // Valores compartidos finales de un PATCH (los del DTO sobre los actuales).
  static mergeUpdate(
    current: SharedPhaseValues,
    dto: UpdateGroupPhaseDto,
  ): SharedPhaseValues {
    return {
      name: dto.name ?? current.name,
      startDate:
        dto.startDate !== undefined ? dto.startDate : current.startDate,
      endDate: dto.endDate !== undefined ? dto.endDate : current.endDate,
    };
  }

  // Los grupos de una misma fase comparten nombre y fechas.
  static assertMatchesSiblings(
    siblings: GroupPhase[],
    values: SharedPhaseValues,
    order: number,
  ): void {
    if (siblings.length === 0) return;
    const expected = GroupPhaseConsistencyPolicy.sharedValuesOf(siblings[0]);
    if (
      values.name === expected.name &&
      values.startDate === expected.startDate &&
      values.endDate === expected.endDate
    ) {
      return;
    }
    throw new ApplicationException(
      ErrorCase.INVALID_OPERATION,
      `Los grupos del orden ${order} forman una sola fase y deben compartir ` +
        `nombre y fechas. Valores esperados: name "${expected.name}", ` +
        `startDate ${expected.startDate ?? 'null'}, ` +
        `endDate ${expected.endDate ?? 'null'}`,
    );
  }

  /**
   * Valores que hay que copiar a los grupos hermanos, o null si no hay que
   * propagar nada. Si el grupo cambia de order no se propaga: ya se validó que
   * coincide con los grupos del nuevo order.
   */
  static valuesToPropagate(
    current: SharedPhaseValues,
    next: SharedPhaseValues,
    orderChanges: boolean,
  ): SharedPhaseValues | null {
    if (orderChanges) return null;
    const changed =
      next.name !== current.name ||
      next.startDate !== current.startDate ||
      next.endDate !== current.endDate;
    return changed ? next : null;
  }

  // Copia nombre y fechas a los grupos hermanos (no guarda).
  static applyTo(siblings: GroupPhase[], values: SharedPhaseValues): void {
    for (const sibling of siblings) {
      sibling.name = values.name;
      // Las columnas son nullable aunque el tipo de la entidad no lo diga
      sibling.startDate = values.startDate as string;
      sibling.endDate = values.endDate as string;
    }
  }
}

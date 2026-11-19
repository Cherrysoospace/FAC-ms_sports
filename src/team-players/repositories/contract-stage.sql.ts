import { ContractStage } from '../enums/contract-stage.enum';
import { ContractStatus } from '../enums/contract-status.enum';
import { toDateOnly } from '../../common/dates/date-only';

export interface SqlCondition {
  sql: string;
  params: Record<string, unknown>;
}

/**
 * Condición SQL equivalente a ContractPeriodPolicy.stageOf para un alias de
 * team_players con columnas status, start_date y end_date. Única copia de la
 * regla en SQL: la usan TeamPlayersRepository y PlayersRepository.
 * `prefix` evita choques de parámetros si se usa varias veces en una consulta.
 */
export function contractStageCondition(
  alias: string,
  stage: ContractStage,
  prefix = 'stage',
  today = new Date(),
): SqlCondition {
  const params = {
    [`${prefix}Today`]: toDateOnly(today),
    [`${prefix}Active`]: ContractStatus.ACTIVE,
  };
  const status = `${alias}.status`;
  const start = `${alias}.start_date`;
  const end = `${alias}.end_date`;
  const today_ = `:${prefix}Today`;
  const active = `:${prefix}Active`;

  switch (stage) {
    case ContractStage.CURRENT:
      return {
        sql: `(${status} = ${active} AND ${start} <= ${today_} AND ${end} >= ${today_})`,
        params,
      };
    case ContractStage.UPCOMING:
      return {
        sql: `(${status} = ${active} AND ${start} > ${today_})`,
        params,
      };
    case ContractStage.PAST:
      return {
        sql: `(${status} <> ${active} OR ${end} < ${today_})`,
        params,
      };
  }
}

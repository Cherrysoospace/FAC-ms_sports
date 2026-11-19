/**
 * En qué momento está un contrato respecto a hoy (ContractPeriodPolicy.stageOf):
 * CURRENT = vigente hoy; UPCOMING = empieza después; PAST = retirado o vencido.
 * Se calcula, no se guarda.
 */
export enum ContractStage {
  CURRENT = 'CURRENT',
  UPCOMING = 'UPCOMING',
  PAST = 'PAST',
}

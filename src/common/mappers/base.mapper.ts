/**
 * Clase base abstracta para los mappers de salida de los módulos.
 * Evita repetir `entities.map((entity) => this.toDto(entity))` en cada servicio.
 */
export abstract class BaseMapper<TEntity, TResponseDto> {
  abstract toDto(entity: TEntity): TResponseDto;

  toDtoList(entities: readonly TEntity[]): TResponseDto[] {
    return entities.map((entity) => this.toDto(entity));
  }
}


import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CreateVenueDto } from './create-venue.dto';
import { NotNullIfPresent, TrimSpaces } from '../../common/validation';

/**
 * Actualización parcial de un escenario.
 *
 * `parentId`: ausente = no cambia; `null` = pasa a ser escenario principal;
 * número = nuevo padre (el servicio valida existencia y ciclos).
 * `address` también acepta `null` (borra la dirección).
 * `name` y `active` NO aceptan `null` (columnas NOT NULL): se omiten de
 * PartialType (agrega `@IsOptional`) y se redeclaran con `@NotNullIfPresent`.
 */
export class UpdateVenueDto extends PartialType(
  OmitType(CreateVenueDto, ['name'] as const),
) {
  // El decorador más cercano a la propiedad (IsNotEmpty) se registra primero,
  // así su mensaje es el que muestra el filtro cuando llega null o vacío.
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre no puede ser vacío' })
  name?: string;

  // Desactivar o reactivar el escenario
  @NotNullIfPresent()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}

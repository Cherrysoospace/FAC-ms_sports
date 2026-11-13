import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateBallDto {
  @Transform(trim)
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  @IsString({ message: 'La marca debe ser texto' })
  @MaxLength(80, { message: 'La marca no puede superar los 80 caracteres' })
  brand!: string;

  @Transform(trim)
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  @IsString({ message: 'El modelo debe ser texto' })
  @MaxLength(80, { message: 'El modelo no puede superar los 80 caracteres' })
  model!: string;

  // Ausente o null = sin talla
  @Transform(trim)
  @IsOptional()
  @IsString({ message: 'La talla debe ser texto' })
  @MaxLength(20, { message: 'La talla no puede superar los 20 caracteres' })
  size?: string | null;
}

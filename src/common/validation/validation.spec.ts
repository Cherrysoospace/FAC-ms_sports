import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  validateSync,
} from 'class-validator';
import { IsDateOnly, NotNullIfPresent, ToBoolean, TrimSpaces } from './index';

// DTO de prueba con el mismo patrón que los DTO del proyecto.
class SamplePatchDto {
  @TrimSpaces()
  @NotNullIfPresent()
  @MaxLength(10, { message: 'Máximo 10' })
  @IsString({ message: 'Debe ser texto' })
  @IsNotEmpty({ message: 'No puede ser vacío' })
  name?: string;
}

class SampleQueryDto {
  @ToBoolean()
  @IsOptional()
  @IsBoolean({ message: 'Debe ser verdadero o falso' })
  active?: boolean;
}

class SampleDateDto {
  @IsOptional()
  @IsDateOnly('Formato YYYY-MM-DD')
  day?: string | null;
}

// Primer mensaje de error de cada campo, como lo muestra el filtro global.
const firstErrors = <T extends object>(cls: new () => T, input: object) => {
  const errors = validateSync(plainToInstance(cls, input));
  return Object.fromEntries(
    errors.map((e) => [e.property, Object.values(e.constraints ?? {})[0]]),
  );
};

describe('@NotNullIfPresent', () => {
  it('no valida el campo si no viene (undefined)', () => {
    expect(firstErrors(SamplePatchDto, {})).toEqual({});
  });

  it('null da error, con el mensaje del decorador más cercano a la propiedad', () => {
    expect(firstErrors(SamplePatchDto, { name: null })).toEqual({
      name: 'No puede ser vacío',
    });
  });

  it('vacío también da error', () => {
    expect(firstErrors(SamplePatchDto, { name: '' })).toEqual({
      name: 'No puede ser vacío',
    });
  });
});

describe('@TrimSpaces', () => {
  it('quita espacios al inicio y al final y colapsa los internos', () => {
    expect(
      plainToInstance(SamplePatchDto, { name: '  Copa    del   Rey  ' }).name,
    ).toBe('Copa del Rey');
  });

  it('solo espacios queda vacío y da error', () => {
    expect(firstErrors(SamplePatchDto, { name: '    ' })).toEqual({
      name: 'No puede ser vacío',
    });
  });

  it('no toca valores que no son texto', () => {
    expect(plainToInstance(SamplePatchDto, { name: 5 }).name).toBe(5);
    expect(firstErrors(SamplePatchDto, { name: 5 })).toEqual({
      name: 'Debe ser texto',
    });
  });
});

describe('@ToBoolean', () => {
  const value = (input: object) =>
    plainToInstance(SampleQueryDto, input).active;

  it("'true' y true → true", () => {
    expect(value({ active: 'true' })).toBe(true);
    expect(value({ active: true })).toBe(true);
  });

  it("'false' y cualquier otro valor presente → false", () => {
    expect(value({ active: 'false' })).toBe(false);
    expect(value({ active: '1' })).toBe(false);
  });

  it('ausente → undefined (sin filtro) y sin error', () => {
    expect(value({})).toBeUndefined();
    expect(firstErrors(SampleQueryDto, {})).toEqual({});
  });
});

describe('@IsDateOnly', () => {
  it('acepta YYYY-MM-DD', () => {
    expect(firstErrors(SampleDateDto, { day: '2026-12-01' })).toEqual({});
  });

  it('rechaza otros formatos con el mensaje dado', () => {
    expect(firstErrors(SampleDateDto, { day: '01/12/2026' })).toEqual({
      day: 'Formato YYYY-MM-DD',
    });
    expect(firstErrors(SampleDateDto, { day: '2026-12-01T10:00:00' })).toEqual({
      day: 'Formato YYYY-MM-DD',
    });
  });
});

import { NotFoundException } from '@nestjs/common';

/** Equivalente a ResourceNotFoundException.java (404). */
export class ResourceNotFoundException extends NotFoundException {
  constructor(message: string) {
    super(message);
  }

  /**
   * Mensaje neutro en género, sirve para cualquier recurso:
   * "Localidad con id 3 no existe", "Torneo con id 7 no existe".
   */
  static of(resource: string, id: number): ResourceNotFoundException {
    return new ResourceNotFoundException(`${resource} con id ${id} no existe`);
  }
}

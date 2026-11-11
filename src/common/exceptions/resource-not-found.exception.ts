import { NotFoundException } from '@nestjs/common';

/** Equivalente a ResourceNotFoundException.java (404). */
export class ResourceNotFoundException extends NotFoundException {
  constructor(message: string) {
    super(message);
  }

  static of(resource: string, id: number): ResourceNotFoundException {
    return new ResourceNotFoundException(
      `${resource} no encontrado con id: ${id}`,
    );
  }
}

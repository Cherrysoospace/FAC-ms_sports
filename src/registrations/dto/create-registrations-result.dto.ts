import { RegistrationResponseDto } from './registration-response.dto';

// Respuesta de POST /registrations
export class CreateRegistrationsResultDto {
  message!: string;
  registrations!: RegistrationResponseDto[];
}

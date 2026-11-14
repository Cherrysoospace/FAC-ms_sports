import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { RegistrationQueryDto } from './dto/registration-query.dto';

// Una inscripción solo se crea o se retira: no hay PATCH /:id ni DELETE.
@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Get()
  findAll(@Query() query: RegistrationQueryDto) {
    return this.registrationsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRegistrationDto) {
    return this.registrationsService.create(dto);
  }

  @Patch(':id/withdraw')
  withdraw(@Param('id', ParseIntPipe) id: number) {
    return this.registrationsService.withdraw(id);
  }
}

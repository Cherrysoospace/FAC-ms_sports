import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PAYMENT_METHOD_VALIDATORS,
  type IPaymentMethodValidator,
  type PaymentMethodValidationInput,
} from '../common/contracts';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';
import { formatCount } from '../common/text/spanish-list';
import { FansService } from '../fans/fans.service';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { FanPaymentMethod } from './entities/fan-payment-method.entity';
import { FanPaymentMethodsRepository } from './repositories/fan-payment-methods.repository';
import { FanPaymentMethodMapper } from './mappers/fan-payment-method.mapper';
import { PaymentMethodsService } from './payment-methods.service';
import { RegisterFanPaymentMethodDto } from './dto/register-fan-payment-method.dto';
import { UpdateFanPaymentMethodDto } from './dto/update-fan-payment-method.dto';
import { FanPaymentMethodQueryDto } from './dto/fan-payment-method-query.dto';
import { FanPaymentMethodResponseDto } from './dto/fan-payment-method-response.dto';

@Injectable()
export class FanPaymentMethodsService {
  constructor(
    @InjectRepository(FanPaymentMethod)
    private readonly fanPaymentMethodRepository: Repository<FanPaymentMethod>,
    private readonly fanPaymentMethodsRepository: FanPaymentMethodsRepository,
    private readonly fanPaymentMethodMapper: FanPaymentMethodMapper,
    private readonly fansService: FansService,
    private readonly paymentMethodsService: PaymentMethodsService,
    @Inject(PAYMENT_METHOD_VALIDATORS)
    private readonly validators: readonly IPaymentMethodValidator[],
  ) {}

  async findMine(
    user: AuthenticatedUser,
    query: FanPaymentMethodQueryDto,
  ): Promise<FanPaymentMethodResponseDto[]> {
    const fan = await this.fansService.getFanBySecurityUserOrFail(user.id);
    const items = await this.fanPaymentMethodsRepository.findByFilters({
      fanId: fan.id,
      active: query.active,
    });
    return this.fanPaymentMethodMapper.toDtoList(items);
  }

  async findOneMine(
    user: AuthenticatedUser,
    id: number,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.getFanBySecurityUserOrFail(user.id);
    const record = await this.getFanPaymentMethodOrFail(id);
    this.assertOwnership(record, fan.id);
    return this.fanPaymentMethodMapper.toDto(record);
  }

  async registerMine(
    user: AuthenticatedUser,
    dto: RegisterFanPaymentMethodDto,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const catalogMethod =
      await this.paymentMethodsService.getActivePaymentMethodOrFail(
        dto.paymentMethodId,
      );

    this.validateByStrategy({
      type: catalogMethod.type,
      reference: dto.reference,
      label: dto.alias,
      details: dto.details,
    });

    await this.assertReferenceAvailable(fan.id, catalogMethod.id, dto.reference);

    const saved = await this.fanPaymentMethodRepository.save(
      this.fanPaymentMethodMapper.toEntity(fan, catalogMethod, dto),
    );
    const hydrated = await this.getFanPaymentMethodOrFail(saved.id);
    return this.fanPaymentMethodMapper.toDto(hydrated);
  }

  async updateMine(
    user: AuthenticatedUser,
    id: number,
    dto: UpdateFanPaymentMethodDto,
  ): Promise<FanPaymentMethodResponseDto> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const record = await this.getFanPaymentMethodOrFail(id);
    this.assertOwnership(record, fan.id);

    const nextReference = dto.reference ?? record.reference;
    const nextAlias = dto.alias ?? record.alias;
    const nextDetails = dto.details ?? record.details;

    this.validateByStrategy({
      type: record.paymentMethod.type,
      reference: nextReference,
      label: nextAlias,
      details: nextDetails,
    });

    if (
      dto.reference !== undefined &&
      dto.reference.toLowerCase() !== record.reference.toLowerCase()
    ) {
      await this.assertReferenceAvailable(
        fan.id,
        record.paymentMethod.id,
        dto.reference,
        id,
      );
    }

    await this.fanPaymentMethodRepository.save(
      this.fanPaymentMethodMapper.mergeEntity(record, dto),
    );
    return this.fanPaymentMethodMapper.toDto(
      await this.getFanPaymentMethodOrFail(id),
    );
  }

  async removeMine(
    user: AuthenticatedUser,
    id: number,
  ): Promise<{ message: string }> {
    const fan = await this.fansService.getActiveFanBySecurityUserOrFail(
      user.id,
    );
    const record = await this.getFanPaymentMethodOrFail(id);
    this.assertOwnership(record, fan.id);

    const bets = await this.fanPaymentMethodsRepository.countBets(id);
    if (bets > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar el método de pago '${record.alias}' porque tiene ` +
          `${formatCount(bets, 'apuesta', 'apuestas')} asociadas. ` +
          'Desactívelo con PATCH { "active": false }',
      );
    }

    await this.fanPaymentMethodRepository.remove(record);
    return { message: `Método de pago '${record.alias}' eliminado correctamente` };
  }

  // Reutilizado en Apuestas (HU-GC-11): exige pertenencia al aficionado y estado activo.
  async getOwnedActiveMethodOrFail(
    fanId: number,
    fanPaymentMethodId: number,
  ): Promise<FanPaymentMethod> {
    const record = await this.getFanPaymentMethodOrFail(fanPaymentMethodId);
    this.assertOwnership(record, fanId);

    if (!record.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `Tu método de pago '${record.alias}' está inactivo`,
      );
    }
    if (!record.paymentMethod.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El método de pago ${record.paymentMethod.name} se encuentra deshabilitado`,
      );
    }

    return record;
  }

  private async getFanPaymentMethodOrFail(
    id: number,
  ): Promise<FanPaymentMethod> {
    const record =
      await this.fanPaymentMethodsRepository.findOneWithRelations(id);
    if (!record) {
      throw ResourceNotFoundException.of('Método de pago del aficionado', id);
    }
    return record;
  }

  private assertOwnership(record: FanPaymentMethod, fanId: number): void {
    if (record.fan.id !== fanId) {
      throw new ApplicationException(
        ErrorCase.FORBIDDEN,
        'No tienes permiso para acceder o utilizar un método de pago de otro aficionado',
      );
    }
  }

  private validateByStrategy(input: PaymentMethodValidationInput): void {
    const validator = this.validators.find((candidate) =>
      candidate.supports(input.type),
    );
    if (!validator) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `No existe un validador configurado para el tipo de pago ${input.type}`,
      );
    }
    validator.validate(input);
  }

  private async assertReferenceAvailable(
    fanId: number,
    paymentMethodId: number,
    reference: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.fanPaymentMethodsRepository.findDuplicate(
      fanId,
      paymentMethodId,
      reference,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya tienes registrado este método de pago con la referencia ${reference}`,
      );
    }
  }
}


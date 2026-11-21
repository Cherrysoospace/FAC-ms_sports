import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './entities/payment-method.entity';
import { PaymentMethodsRepository } from './repositories/payment-methods.repository';
import { PaymentMethodMapper } from './mappers/payment-method.mapper';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PaymentMethodQueryDto } from './dto/payment-method-query.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { formatCount } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly paymentMethodsRepository: PaymentMethodsRepository,
    private readonly paymentMethodMapper: PaymentMethodMapper,
  ) {}

  async findAll(
    query: PaymentMethodQueryDto,
  ): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.paymentMethodsRepository.findByFilters(query);
    const counts =
      await this.paymentMethodsRepository.countFanPaymentMethodsByIds(
        methods.map((method) => method.id),
      );
    return this.paymentMethodMapper.toDtoListWithCounts(methods, counts);
  }

  async findOne(id: number): Promise<PaymentMethodResponseDto> {
    const method = await this.getPaymentMethodOrFail(id);
    const count =
      await this.paymentMethodsRepository.countFanPaymentMethods(id);
    return this.paymentMethodMapper.toDtoWithCount(method, count);
  }

  async getPaymentMethodOrFail(id: number): Promise<PaymentMethod> {
    const method = await this.paymentMethodRepository.findOne({
      where: { id },
    });
    if (!method) throw ResourceNotFoundException.of('Método de pago', id);
    return method;
  }

  async getActivePaymentMethodOrFail(id: number): Promise<PaymentMethod> {
    const method = await this.getPaymentMethodOrFail(id);
    if (!method.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El método de pago ${method.name} está inactivo`,
      );
    }
    return method;
  }

  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethodResponseDto> {
    await this.assertNameAvailable(dto.name);
    const saved = await this.paymentMethodRepository.save(
      this.paymentMethodMapper.toEntity(dto),
    );
    return this.findOne(saved.id);
  }

  async update(
    id: number,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const method = await this.getPaymentMethodOrFail(id);

    if (dto.name !== undefined && dto.name !== method.name) {
      await this.assertNameAvailable(dto.name, id);
    }

    if (dto.type !== undefined && dto.type !== method.type) {
      const associated =
        await this.paymentMethodsRepository.countFanPaymentMethods(id);
      if (associated > 0) {
        throw new BusinessRuleException(
          `No se puede cambiar el tipo de '${method.name}' porque tiene ` +
            `${formatCount(associated, 'registro asociado', 'registros asociados')}`,
        );
      }
    }

    await this.paymentMethodRepository.save(
      this.paymentMethodMapper.mergeEntity(method, dto),
    );
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const method = await this.getPaymentMethodOrFail(id);
    const associated =
      await this.paymentMethodsRepository.countFanPaymentMethods(id);

    if (associated > 0) {
      throw new BusinessRuleException(
        `No se puede eliminar '${method.name}' porque está asociado a ` +
          `${formatCount(associated, 'aficionado', 'aficionados')}. ` +
          'Desactívelo con PATCH { "active": false }',
      );
    }

    await this.paymentMethodRepository.remove(method);
    return { message: `Método de pago #${id} eliminado correctamente` };
  }

  private async assertNameAvailable(
    name: string,
    excludeId?: number,
  ): Promise<void> {
    const existing = await this.paymentMethodsRepository.findByNameIgnoringCase(
      name,
      excludeId,
    );
    if (existing) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un método de pago con el nombre "${name}"`,
      );
    }
  }
}

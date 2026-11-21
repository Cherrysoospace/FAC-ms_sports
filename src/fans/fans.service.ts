import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Fan } from './entities/fan.entity';
import { FansRepository } from './repositories/fans.repository';
import { FanMapper } from './mappers/fan.mapper';
import { CreateFanDto } from './dto/create-fan.dto';
import { UpdateFanDto } from './dto/update-fan.dto';
import { RegisterMyFanDto } from './dto/register-my-fan.dto';
import { UpdateMyFanDto } from './dto/update-my-fan.dto';
import { FanQueryDto } from './dto/fan-query.dto';
import { FanResponseDto } from './dto/fan-response.dto';
import type { AuthenticatedUser } from '../security/authenticated-user';
import { plural } from '../common/text/spanish-list';
import {
  ApplicationException,
  BusinessRuleException,
  ErrorCase,
  ResourceNotFoundException,
} from '../common/exceptions';

@Injectable()
export class FansService {
  constructor(
    @InjectRepository(Fan)
    private readonly fanRepository: Repository<Fan>,
    private readonly fansRepository: FansRepository,
    private readonly fanMapper: FanMapper,
  ) {}

  async findAll(query: FanQueryDto): Promise<FanResponseDto[]> {
    const fans = await this.fansRepository.findByFilters(query);
    const favoriteCounts =
      await this.fansRepository.countFavoriteTeamsByFanIds(
        fans.map((fan) => fan.id),
      );
    return this.fanMapper.toDtoListWithCounts(fans, favoriteCounts);
  }

  async findOne(id: number): Promise<FanResponseDto> {
    const fan = await this.getFanOrFail(id);
    const favoriteTeamsCount = await this.fansRepository.countFavoriteTeams(id);
    return this.fanMapper.toDtoWithCount(fan, favoriteTeamsCount);
  }

  async create(dto: CreateFanDto): Promise<FanResponseDto> {
    await this.assertUniqueFields({
      securityUserId: dto.securityUserId,
      documentNumber: dto.documentNumber,
      email: dto.email,
    });

    const saved = await this.fanRepository.save(this.fanMapper.toEntity(dto));
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateFanDto): Promise<FanResponseDto> {
    const fan = await this.getFanOrFail(id);
    await this.assertUniqueFields(
      {
        documentNumber:
          dto.documentNumber !== undefined &&
          dto.documentNumber !== fan.documentNumber
            ? dto.documentNumber
            : undefined,
        email:
          dto.email !== undefined && dto.email !== fan.email
            ? dto.email
            : undefined,
      },
      id,
    );

    await this.fanRepository.save(this.fanMapper.mergeEntity(fan, dto));
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const fan = await this.getFanOrFail(id);
    const favoriteTeams = await this.fansRepository.countFavoriteTeams(id);

    const favoriteText = plural(
      favoriteTeams,
      'equipo favorito',
      'equipos favoritos',
    );
    if (favoriteText) {
      throw new BusinessRuleException(
        `No se puede eliminar el aficionado porque tiene ${favoriteText} ` +
          'asociados. Desactívelo con PATCH { "active": false }',
      );
    }
    // TODO (Fercho): bloquear también si tiene métodos de pago, boletos o apuestas.

    await this.fanRepository.remove(fan);
    return { message: `Aficionado #${id} eliminado correctamente` };
  }

  async findMyProfile(user: AuthenticatedUser): Promise<FanResponseDto> {
    const fan = await this.getFanBySecurityUserOrFail(user.id);
    const favoriteTeamsCount = await this.fansRepository.countFavoriteTeams(
      fan.id,
    );
    return this.fanMapper.toDtoWithCount(fan, favoriteTeamsCount);
  }

  async registerMyProfile(
    user: AuthenticatedUser,
    dto: RegisterMyFanDto,
  ): Promise<FanResponseDto> {
    const email = dto.email ?? user.email?.trim().toLowerCase();
    if (!email) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        'El correo electrónico es obligatorio para registrar tu perfil de aficionado',
      );
    }

    await this.assertUniqueFields({
      securityUserId: user.id,
      documentNumber: dto.documentNumber,
      email,
    });

    const saved = await this.fanRepository.save(
      this.fanMapper.toEntity({
        securityUserId: user.id,
        fullName: dto.fullName,
        documentNumber: dto.documentNumber,
        email,
        phone: dto.phone,
      }),
    );
    return this.findOne(saved.id);
  }

  async updateMyProfile(
    user: AuthenticatedUser,
    dto: UpdateMyFanDto,
  ): Promise<FanResponseDto> {
    const fan = await this.getActiveFanBySecurityUserOrFail(user.id);
    await this.assertUniqueFields(
      {
        documentNumber:
          dto.documentNumber !== undefined &&
          dto.documentNumber !== fan.documentNumber
            ? dto.documentNumber
            : undefined,
        email:
          dto.email !== undefined && dto.email !== fan.email
            ? dto.email
            : undefined,
      },
      fan.id,
    );

    await this.fanRepository.save(this.fanMapper.mergeEntity(fan, dto));
    return this.findOne(fan.id);
  }

  async getFanOrFail(id: number): Promise<Fan> {
    const fan = await this.fanRepository.findOne({ where: { id } });
    if (!fan) throw ResourceNotFoundException.of('Aficionado', id);
    return fan;
  }

  async getActiveFanOrFail(id: number): Promise<Fan> {
    const fan = await this.getFanOrFail(id);
    this.assertActiveFan(fan);
    return fan;
  }

  async getFanBySecurityUserOrFail(securityUserId: number): Promise<Fan> {
    const fan = await this.fansRepository.findBySecurityUserId(securityUserId);
    if (!fan) {
      throw new ResourceNotFoundException(
        'No tienes un perfil de aficionado registrado',
      );
    }
    return fan;
  }

  async getActiveFanBySecurityUserOrFail(securityUserId: number): Promise<Fan> {
    const fan = await this.getFanBySecurityUserOrFail(securityUserId);
    this.assertActiveFan(fan);
    return fan;
  }

  private assertActiveFan(fan: Fan): void {
    if (!fan.active) {
      throw new ApplicationException(
        ErrorCase.INVALID_OPERATION,
        `El aficionado ${fan.fullName} está inactivo`,
      );
    }
  }

  private async assertUniqueFields(
    fields: {
      securityUserId?: number;
      documentNumber?: string;
      email?: string;
    },
    excludeId?: number,
  ): Promise<void> {
    const [byUser, byDocument, byEmail] = await Promise.all([
      fields.securityUserId !== undefined
        ? this.fansRepository.findBySecurityUserId(fields.securityUserId)
        : Promise.resolve(null),
      fields.documentNumber !== undefined
        ? this.fansRepository.findByDocumentNumber(
            fields.documentNumber,
            excludeId,
          )
        : Promise.resolve(null),
      fields.email !== undefined
        ? this.fansRepository.findByEmailIgnoringCase(fields.email, excludeId)
        : Promise.resolve(null),
    ]);

    if (byUser && byUser.id !== excludeId) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        'Ya existe un perfil de aficionado asociado a este usuario',
      );
    }
    if (byDocument) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un aficionado registrado con el documento ${fields.documentNumber}`,
      );
    }
    if (byEmail) {
      throw new ApplicationException(
        ErrorCase.ALREADY_EXISTS,
        `Ya existe un aficionado registrado con el correo ${fields.email}`,
      );
    }
  }
}

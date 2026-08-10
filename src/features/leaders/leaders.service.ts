import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, FindOptionsWhere } from 'typeorm';
import { Leader } from './leader.entity';
import { TenantAwareService } from '../../shared/base/tenant-aware.service';
import { UsersService } from '../../core/users/users.service';
import { UserRole } from '../../shared/enums';

@Injectable()
export class LeadersService extends TenantAwareService<Leader> {
  constructor(
    @InjectRepository(Leader) repo: Repository<Leader>,
    private usersService: UsersService,
  ) {
    super(repo);
  }

  async findAll(tenantId: string, filters?: FindOptionsWhere<Leader>) {
    // Sync votersCount before returning to ensure accuracy
    await this.repository.query(
      `UPDATE leaders l SET "votersCount" = (
        SELECT COUNT(*) FROM voters v WHERE v."leaderId" = l.id::text AND v."tenantId" = $1
      ) WHERE l."tenantId" = $1`,
      [tenantId],
    );
    return super.findAll(tenantId, filters);
  }

  async create(
    tenantId: string,
    dto: DeepPartial<Leader> & { createAccess?: boolean; password?: string },
  ) {
    const { createAccess, password, ...leaderData } = dto;

    if (createAccess) {
      if (!leaderData.email) {
        throw new BadRequestException('E-mail e obrigatorio para criar acesso');
      }
      if (!password || password.length < 6) {
        throw new BadRequestException(
          'Senha com minimo de 6 caracteres e obrigatoria para criar acesso',
        );
      }

      const user = await this.usersService.create({
        name: leaderData.name as string,
        email: leaderData.email,
        password: password,
        role: UserRole.LEADER,
        tenantId,
        phone: leaderData.phone as string,
        cpf: leaderData.cpf as string,
      });

      leaderData.userId = user.id;
    }

    return super.create(tenantId, leaderData);
  }

  /**
   * Concede acesso (login) a uma liderança que ainda não tem: cria um User
   * role LEADER e vincula via userId.
   */
  async grantAccess(
    tenantId: string,
    leaderId: string,
    data: { email?: string; password: string },
  ) {
    const leader = await this.findOne(tenantId, leaderId);
    if (leader.userId) {
      throw new BadRequestException('Esta liderança já possui acesso');
    }
    const email = data.email || leader.email;
    if (!email) {
      throw new BadRequestException(
        'E-mail é obrigatório para criar o acesso',
      );
    }

    const user = await this.usersService.create({
      name: leader.name,
      email,
      password: data.password,
      role: UserRole.LEADER,
      tenantId,
      phone: leader.phone,
      cpf: leader.cpf,
    });

    leader.userId = user.id;
    if (!leader.email) leader.email = email;
    await this.repository.save(leader);
    return this.findOne(tenantId, leaderId);
  }

  /**
   * Remove o acesso de uma liderança: apaga o User vinculado (liberando o
   * e-mail) e volta a liderança para o estado "sem acesso" (userId = null).
   */
  async revokeAccess(tenantId: string, leaderId: string) {
    const leader = await this.findOne(tenantId, leaderId);
    if (!leader.userId) {
      throw new BadRequestException('Esta liderança não possui acesso');
    }
    await this.usersService.remove(leader.userId, tenantId);
    leader.userId = null as any;
    await this.repository.save(leader);
    return this.findOne(tenantId, leaderId);
  }

  /** Redefine a senha do login de uma liderança que tem acesso. */
  async resetAccessPassword(
    tenantId: string,
    leaderId: string,
    password: string,
  ) {
    const leader = await this.findOne(tenantId, leaderId);
    if (!leader.userId) {
      throw new BadRequestException('Esta liderança não possui acesso');
    }
    await this.usersService.update(leader.userId, { password }, tenantId);
    return { success: true };
  }
}

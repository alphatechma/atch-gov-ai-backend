import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';
import { Subscriber } from '../../subscribers/subscriber.entity';
import { Leader } from '../../../features/leaders/leader.entity';
import { PermissionsService } from '../../permissions/permissions.service';
import { UserRole } from '../../../shared/enums';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string | null;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(Subscriber)
    private subscribersRepo: Repository<Subscriber>,
    @InjectRepository(Leader)
    private leadersRepo: Repository<Leader>,
    private permissionsService: PermissionsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersRepo.findOne({
      where: { id: payload.sub },
      relations: ['tenant'],
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inativo ou não encontrado');
    }

    if (
      user.sessionsValidAfter &&
      payload.iat &&
      payload.iat * 1000 < user.sessionsValidAfter.getTime()
    ) {
      throw new UnauthorizedException('Sessão revogada, faça login novamente');
    }

    if (user.tenantId) {
      const sub = await this.subscribersRepo
        .createQueryBuilder('s')
        .innerJoin('s.user', 'u')
        .where('u.tenantId = :tenantId', { tenantId: user.tenantId })
        .andWhere('s.active = true')
        .getOne();
      if (!sub) {
        throw new UnauthorizedException({
          message: 'Sua assinatura expirou.',
          code: 'SUBSCRIPTION_EXPIRED',
        });
      }
    }

    const permissions = await this.permissionsService.getEffectivePermissions({
      id: user.id,
      role: user.role,
    });

    // Escopo por liderança: para usuários LEADER, resolve a liderança vinculada.
    // Sem vínculo → null (o fail-safe é aplicado na camada de escopo).
    let leaderId: string | null = null;
    if (user.role === UserRole.LEADER) {
      const leader = await this.leadersRepo.findOne({
        where: { userId: user.id },
        select: { id: true },
      });
      leaderId = leader?.id ?? null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
      allowedModules: user.allowedModules,
      permissions,
      leaderId,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { User } from '../../core/users/user.entity';
import { UserRole } from '../../shared/enums';
import { NotificationType as NType } from '../../shared/enums/features';

interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  type: NType;
  title: string;
  message: string;
  data?: Record<string, any> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepo: Repository<Notification>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  /** Cria uma notificação para um usuário específico. */
  async create(params: CreateNotificationParams) {
    const entity = this.notificationsRepo.create({
      ...params,
      data: params.data ?? null,
    });
    return this.notificationsRepo.save(entity);
  }

  /**
   * Cria a mesma notificação para todos os usuários ativos do tenant que
   * possuem um dos papéis informados (ex.: avisar os ADMs de uma nova
   * solicitação). Retorna a quantidade de notificações criadas.
   */
  async notifyRoles(
    tenantId: string,
    roles: UserRole[],
    payload: Omit<CreateNotificationParams, 'tenantId' | 'userId'>,
  ): Promise<number> {
    const recipients = await this.usersRepo.find({
      where: { tenantId, role: In(roles), active: true },
      select: { id: true },
    });
    if (recipients.length === 0) return 0;

    const entities = recipients.map((u) =>
      this.notificationsRepo.create({
        tenantId,
        userId: u.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ?? null,
      }),
    );
    await this.notificationsRepo.save(entities);
    return entities.length;
  }

  /** Lista notificações do usuário (mais recentes primeiro), opcionalmente só as não lidas. */
  async findForUser(userId: string, unreadOnly = false, limit = 50) {
    return this.notificationsRepo.find({
      where: unreadOnly ? { userId, read: false } : { userId },
      order: { createdAt: 'DESC' },
      take: Math.min(200, Math.max(1, limit)),
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notificationsRepo.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.notificationsRepo.findOne({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada');
    if (!notification.read) {
      notification.read = true;
      await this.notificationsRepo.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationsRepo.update(
      { userId, read: false },
      { read: true },
    );
    return { updated: result.affected ?? 0 };
  }
}

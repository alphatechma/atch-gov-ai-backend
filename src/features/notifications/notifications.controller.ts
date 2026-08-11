import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

/**
 * Notificações in-app do usuário logado. Não é gated por módulo: todo usuário
 * autenticado acessa apenas as próprias notificações (escopo por req.user.id).
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: any, @Query('unread') unread?: string) {
    return this.notificationsService.findForUser(
      req.user.id,
      unread === 'true',
    );
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const count = await this.notificationsService.unreadCount(req.user.id);
    return { count };
  }

  @Patch('read-all')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificationsService.markRead(req.user.id, id);
  }
}

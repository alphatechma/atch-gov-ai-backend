import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { LeadersService } from './leaders.service';
import { CreateLeaderDto } from './dto/create-leader.dto';
import { UpdateLeaderDto } from './dto/update-leader.dto';
import { GrantAccessDto } from './dto/grant-access.dto';
import { ResetAccessPasswordDto } from './dto/reset-access-password.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { ModuleAccessGuard } from '../../shared/guards/module-access.guard';
import { PermissionsGuard } from '../../shared/guards/permissions.guard';
import { RequiresModule } from '../../shared/decorators/requires-module.decorator';
import { RequiresPermission } from '../../shared/decorators/requires-permission.decorator';
import { PermissionAction } from '../../shared/enums';
import { leaderScopeId } from '../../shared/utils/leader-scope';

@Controller('leaders')
@UseGuards(JwtAuthGuard, ModuleAccessGuard, PermissionsGuard)
@RequiresModule('leaders')
export class LeadersController {
  constructor(private service: LeadersService) {}

  /**
   * Escopo por liderança: um LEADER só acessa a própria liderança.
   * Lança 404 ao tentar acessar o id de outra. `leaderScopeId(req)` retorna o
   * id da liderança do usuário (ou undefined para papéis não escopados).
   */
  private assertOwnLeader(req: any, id: string) {
    const own = leaderScopeId(req);
    if (own !== undefined && own !== id) {
      throw new NotFoundException('Registro não encontrado');
    }
  }

  @Get()
  findAll(@Req() req: any) {
    const own = leaderScopeId(req);
    return this.service.findAll(
      req.tenantId,
      own !== undefined ? { id: own } : undefined,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.assertOwnLeader(req, id);
    return this.service.findOne(req.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateLeaderDto) {
    return this.service.create(req.tenantId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaderDto,
  ) {
    this.assertOwnLeader(req, id);
    return this.service.update(req.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.assertOwnLeader(req, id);
    return this.service.remove(req.tenantId, id);
  }

  // --- Gestão de acesso (apenas gestores/admins; lideranças escopadas não) ---

  /** Bloqueia uma liderança logada de gerenciar acessos. */
  private assertCanManageAccess(req: any) {
    if (leaderScopeId(req) !== undefined) {
      throw new ForbiddenException('Você não pode gerenciar acessos');
    }
  }

  @Post(':id/access')
  @RequiresPermission('leaders', PermissionAction.EDIT)
  grantAccess(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GrantAccessDto,
  ) {
    this.assertCanManageAccess(req);
    return this.service.grantAccess(req.tenantId, id, dto);
  }

  @Delete(':id/access')
  @RequiresPermission('leaders', PermissionAction.EDIT)
  revokeAccess(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    this.assertCanManageAccess(req);
    return this.service.revokeAccess(req.tenantId, id);
  }

  @Patch(':id/access/password')
  @RequiresPermission('leaders', PermissionAction.EDIT)
  resetPassword(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetAccessPasswordDto,
  ) {
    this.assertCanManageAccess(req);
    return this.service.resetAccessPassword(req.tenantId, id, dto.password);
  }
}

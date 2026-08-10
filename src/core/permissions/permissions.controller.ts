import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../shared/enums';
import { PermissionsService } from './permissions.service';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { SetUserOverridesDto } from './dto/set-user-overrides.dto';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  /** Catálogo de permissões (módulo × ação). */
  @Get('catalog')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  getCatalog() {
    return this.permissionsService.getCatalog();
  }

  // --- Defaults por role (globais → apenas SUPER_ADMIN) ---

  @Get('roles')
  @Roles(UserRole.SUPER_ADMIN)
  getAllRoleDefaults() {
    return this.permissionsService.getAllRoleDefaults();
  }

  @Get('roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  getRoleDefaults(
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
  ) {
    return this.permissionsService.getRoleDefaults(role);
  }

  @Put('roles/:role')
  @Roles(UserRole.SUPER_ADMIN)
  setRoleDefaults(
    @Param('role', new ParseEnumPipe(UserRole)) role: UserRole,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.permissionsService.setRoleDefaults(role, dto.permissions);
  }

  // --- Overrides por usuário (TENANT_ADMIN do próprio tenant + SUPER_ADMIN) ---

  @Get('users/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  async getUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: any,
  ) {
    await this.assertScope(userId, user);
    return this.permissionsService.getUserPermissionDetail(userId);
  }

  @Put('users/:userId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN)
  async setUserPermissions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetUserOverridesDto,
    @CurrentUser() user: any,
  ) {
    await this.assertScope(userId, user);
    return this.permissionsService.setUserOverrides(userId, dto.overrides);
  }

  /** TENANT_ADMIN só gerencia usuários do próprio tenant. */
  private async assertScope(userId: string, user: any) {
    if (user.role === UserRole.SUPER_ADMIN) return;
    const targetTenantId =
      await this.permissionsService.getUserTenantId(userId);
    if (!user.tenantId || targetTenantId !== user.tenantId) {
      throw new ForbiddenException(
        'Você não pode gerenciar permissões deste usuário',
      );
    }
  }
}

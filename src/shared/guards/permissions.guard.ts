import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionAction, UserRole } from '../enums';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/requires-permission.decorator';
import { MODULE_KEY } from '../decorators/requires-module.decorator';
import { permissionKey } from '../../core/permissions/permissions.constants';

/**
 * Valida a permissão `module:action` exigida por @RequiresPermission contra as
 * permissões efetivas do usuário (req.user.permissions), calculadas na
 * JwtStrategy. O backend é a fonte de verdade — independe do que a UI exibe.
 *
 * Se o handler NÃO tem @RequiresPermission explícito mas o controller tem
 * @RequiresModule, a ação é inferida pelo verbo HTTP (secure-by-default):
 *   GET/HEAD → view · POST → create · PUT/PATCH → edit · DELETE → delete.
 * Endpoints "POST que é leitura" (busca, geração, etc.) devem declarar
 * @RequiresPermission(module, PermissionAction.VIEW) para sobrescrever.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  private inferAction(method: string): PermissionAction | null {
    switch (method) {
      case 'GET':
      case 'HEAD':
        return PermissionAction.VIEW;
      case 'POST':
        return PermissionAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return PermissionAction.EDIT;
      case 'DELETE':
        return PermissionAction.DELETE;
      default:
        return null;
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    const explicit = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    let module: string | undefined;
    let action: PermissionAction | null;

    if (explicit) {
      module = explicit.module;
      action = explicit.action;
    } else {
      // Sem override: infere a partir do módulo do controller + verbo HTTP.
      module = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!module) return true; // nada a exigir sem contexto de módulo
      action = this.inferAction(request.method);
      if (!action) return true;
    }

    if (!user) throw new ForbiddenException('Não autenticado');
    if (user.role === UserRole.SUPER_ADMIN) return true;

    const permissions: string[] = user.permissions ?? [];
    if (!permissions.includes(permissionKey(module, action))) {
      throw new ForbiddenException(
        `Você não tem permissão para "${action}" em "${module}"`,
      );
    }

    return true;
  }
}

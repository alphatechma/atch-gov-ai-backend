import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '../enums';

export const PERMISSION_KEY = 'requiredPermission';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
}

/**
 * Exige que o usuário tenha a permissão `module:action`.
 * Ex.: @RequiresPermission('voters', PermissionAction.CREATE)
 */
export const RequiresPermission = (module: string, action: PermissionAction) =>
  SetMetadata<string, RequiredPermission>(PERMISSION_KEY, { module, action });

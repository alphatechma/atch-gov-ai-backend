import { PermissionAction, UserRole } from '../../shared/enums';

/**
 * Universo de módulos que possuem permissões granulares (módulo × ação).
 * Mantém alinhado com os moduleKeys usados nos controllers/features e na
 * navegação do frontend.
 */
export const PERMISSIONABLE_MODULES: string[] = [
  'dashboard',
  'users',
  'voters',
  'leaders',
  'heatmap',
  'election-analysis',
  'visits',
  'help-records',
  'staff',
  'executive-requests',
  'cabinet-visits',
  'tasks',
  'agenda',
  'projects',
  'bills',
  'amendments',
  'voting-records',
  'ceap',
  'political-contacts',
  'chat',
  'whatsapp',
  'ai',
  'reports',
];

export const ALL_ACTIONS: PermissionAction[] = [
  PermissionAction.VIEW,
  PermissionAction.CREATE,
  PermissionAction.EDIT,
  PermissionAction.DELETE,
];

const NO_DELETE: PermissionAction[] = [
  PermissionAction.VIEW,
  PermissionAction.CREATE,
  PermissionAction.EDIT,
];

const VIEW_ONLY: PermissionAction[] = [PermissionAction.VIEW];

export interface RoleDefault {
  /** 'ALL' = todos os módulos permissionáveis, ou uma lista de moduleKeys. */
  modules: 'ALL' | string[];
  actions: PermissionAction[];
}

/**
 * Permissões padrão por papel. SUPER_ADMIN não aparece aqui: recebe bypass
 * total no PermissionsService (acesso a tudo).
 *
 * Um role pode ter múltiplas regras (ex.: tudo em alguns módulos, só ver em
 * outros) — as regras são acumuladas.
 */
export const ROLE_PERMISSION_DEFAULTS: Partial<Record<UserRole, RoleDefault[]>> =
  {
    [UserRole.TENANT_ADMIN]: [{ modules: 'ALL', actions: ALL_ACTIONS }],
    [UserRole.MANAGER]: [{ modules: 'ALL', actions: ALL_ACTIONS }],
    [UserRole.ADVISOR]: [{ modules: 'ALL', actions: NO_DELETE }],
    [UserRole.VIEWER]: [{ modules: 'ALL', actions: VIEW_ONLY }],
    [UserRole.LEADER]: [
      // Eleitores: a liderança cadastra (auto-vinculado a ela) e visualiza,
      // mas NÃO altera nem deleta — só ADM/gestão edita depois.
      { modules: ['voters'], actions: [PermissionAction.VIEW, PermissionAction.CREATE] },
      // Demais módulos que a liderança opera: ver/criar/editar (sem deletar).
      { modules: ['dashboard', 'leaders', 'visits', 'tasks'], actions: NO_DELETE },
    ],
    [UserRole.ATTENDANT]: [
      { modules: ['dashboard', 'visits'], actions: NO_DELETE },
    ],
    [UserRole.RECEPTIONIST]: [
      { modules: ['dashboard', 'cabinet-visits'], actions: NO_DELETE },
    ],
  };

/** Monta a chave canônica de uma permissão. */
export function permissionKey(module: string, action: PermissionAction): string {
  return `${module}:${action}`;
}

/** Expande um RoleDefault na lista de chaves de permissão que ele concede. */
export function expandRoleDefault(def: RoleDefault): string[] {
  const modules =
    def.modules === 'ALL' ? PERMISSIONABLE_MODULES : def.modules;
  const keys: string[] = [];
  for (const mod of modules) {
    for (const action of def.actions) {
      keys.push(permissionKey(mod, action));
    }
  }
  return keys;
}

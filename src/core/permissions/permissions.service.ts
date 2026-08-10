import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEffect, UserRole } from '../../shared/enums';
import { User } from '../users/user.entity';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { UserPermissionOverride } from './user-permission-override.entity';

interface PermissionUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class PermissionsService {
  /** Cache dos defaults por role. Invalidado ao editar defaults de um role. */
  private roleDefaultsCache = new Map<UserRole, string[]>();
  /** Cache da lista completa de chaves (para SUPER_ADMIN). */
  private allKeysCache: string[] | null = null;

  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission)
    private rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(UserPermissionOverride)
    private overrideRepo: Repository<UserPermissionOverride>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
  ) {}

  /** Todas as chaves do catálogo (`module:action`). Cacheado. */
  async getAllPermissionKeys(): Promise<string[]> {
    if (!this.allKeysCache) {
      const perms = await this.permissionRepo.find();
      this.allKeysCache = perms.map((p) => p.key);
    }
    return this.allKeysCache;
  }

  /** Permissões padrão de um role (`module:action`). Cacheado. */
  async getRoleDefaults(role: UserRole): Promise<string[]> {
    const cached = this.roleDefaultsCache.get(role);
    if (cached) return cached;

    const rows = await this.rolePermissionRepo.find({ where: { role } });
    const keys = rows.map((rp) => rp.permission.key);
    this.roleDefaultsCache.set(role, keys);
    return keys;
  }

  /**
   * Permissões efetivas de um usuário:
   *   defaults(role) ∪ overrides(ALLOW) − overrides(DENY).
   * SUPER_ADMIN recebe todas as permissões do catálogo.
   */
  async getEffectivePermissions(user: PermissionUser): Promise<string[]> {
    if (user.role === UserRole.SUPER_ADMIN) {
      return this.getAllPermissionKeys();
    }

    const set = new Set(await this.getRoleDefaults(user.role));

    const overrides = await this.overrideRepo.find({
      where: { userId: user.id },
    });
    for (const o of overrides) {
      if (o.effect === PermissionEffect.ALLOW) set.add(o.permission.key);
      else set.delete(o.permission.key);
    }

    return [...set];
  }

  /** Limpa os caches. Chamar após alterar catálogo ou defaults de role. */
  invalidateCache(role?: UserRole): void {
    if (role) this.roleDefaultsCache.delete(role);
    else this.roleDefaultsCache.clear();
    this.allKeysCache = null;
  }

  // ---------------------------------------------------------------------------
  // Administração
  // ---------------------------------------------------------------------------

  /** Catálogo agrupado por módulo (para a UI de administração). */
  async getCatalog(): Promise<
    { module: string; actions: { action: string; key: string; description: string }[] }[]
  > {
    const perms = await this.permissionRepo.find();
    const byModule = new Map<
      string,
      { action: string; key: string; description: string }[]
    >();
    for (const p of perms) {
      let actions = byModule.get(p.module);
      if (!actions) {
        actions = [];
        byModule.set(p.module, actions);
      }
      actions.push({
        action: p.action,
        key: p.key,
        description: p.description,
      });
    }
    return [...byModule.entries()].map(([module, actions]) => ({
      module,
      actions,
    }));
  }

  /** Defaults de todos os roles: mapa role → chaves. */
  async getAllRoleDefaults(): Promise<Record<string, string[]>> {
    const rows = await this.rolePermissionRepo.find();
    const map: Record<string, string[]> = {};
    for (const r of rows) {
      (map[r.role] ??= []).push(r.permission.key);
    }
    return map;
  }

  private async keyToIdMap(): Promise<Map<string, string>> {
    const perms = await this.permissionRepo.find();
    return new Map(perms.map((p) => [p.key, p.id]));
  }

  /** Substitui os defaults de um role pelo conjunto de chaves informado. */
  async setRoleDefaults(role: UserRole, keys: string[]): Promise<string[]> {
    const keyToId = await this.keyToIdMap();
    const ids = keys
      .filter((k) => keyToId.has(k))
      .map((k) => keyToId.get(k));

    await this.rolePermissionRepo.delete({ role });
    if (ids.length) {
      await this.rolePermissionRepo.save(
        ids.map((permissionId) =>
          this.rolePermissionRepo.create({ role, permissionId }),
        ),
      );
    }
    this.invalidateCache(role);
    return this.getRoleDefaults(role);
  }

  /** Detalhe de permissões de um usuário: role, defaults, overrides e efetivas. */
  async getUserPermissionDetail(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const roleDefaults =
      user.role === UserRole.SUPER_ADMIN
        ? await this.getAllPermissionKeys()
        : await this.getRoleDefaults(user.role);

    const overrideRows = await this.overrideRepo.find({ where: { userId } });
    const overrides = overrideRows.map((o) => ({
      key: o.permission.key,
      effect: o.effect,
    }));

    const effective = await this.getEffectivePermissions({
      id: user.id,
      role: user.role,
    });

    return {
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
      roleDefaults,
      overrides,
      effective,
    };
  }

  /** Substitui os overrides de um usuário. */
  async setUserOverrides(
    userId: string,
    items: { permissionKey: string; effect: PermissionEffect }[],
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const keyToId = await this.keyToIdMap();
    await this.overrideRepo.delete({ userId });

    const rows = items
      .filter((i) => keyToId.has(i.permissionKey))
      .map((i) =>
        this.overrideRepo.create({
          userId,
          permissionId: keyToId.get(i.permissionKey),
          effect: i.effect,
        }),
      );
    if (rows.length) await this.overrideRepo.save(rows);

    return this.getUserPermissionDetail(userId);
  }

  /** tenantId do usuário alvo (para checagem de escopo). Lança se não existir. */
  async getUserTenantId(userId: string): Promise<string | null> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: { id: true, tenantId: true },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user.tenantId ?? null;
  }
}

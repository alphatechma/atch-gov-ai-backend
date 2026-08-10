import { UserRole } from '../enums';

/**
 * UUID sentinela que nunca corresponde a uma liderança real. Usado como
 * fail-safe: quando um usuário LEADER não tem liderança vinculada, o escopo
 * aponta para este id e a consulta não retorna nada.
 */
export const NO_LEADER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Retorna o leaderId ao qual o request deve ser limitado, ou `undefined` se o
 * usuário NÃO é escopado (vê tudo do tenant).
 *
 * - role LEADER + liderança vinculada → id da liderança
 * - role LEADER sem liderança vinculada → NO_LEADER_ID (fail-safe: nada)
 * - demais papéis → undefined (sem escopo)
 */
export function leaderScopeId(req: any): string | undefined {
  const user = req?.user;
  if (!user || user.role !== UserRole.LEADER) return undefined;
  return user.leaderId ?? NO_LEADER_ID;
}

/**
 * Versão em objeto para mesclar em um `where` do TypeORM
 * (ex.: base TenantAwareService). Retorna `undefined` quando não há escopo.
 */
export function leaderScopeWhere(
  req: any,
): { leaderId: string } | undefined {
  const id = leaderScopeId(req);
  return id === undefined ? undefined : { leaderId: id };
}

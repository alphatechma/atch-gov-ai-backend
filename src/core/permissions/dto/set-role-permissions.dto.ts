import { IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  /** Lista de chaves de permissão (`module:action`) que o role passa a ter. */
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

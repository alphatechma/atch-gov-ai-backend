import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PermissionEffect } from '../../../shared/enums';

export class UserOverrideItemDto {
  @IsString()
  @IsNotEmpty()
  permissionKey: string; // `module:action`

  @IsEnum(PermissionEffect)
  effect: PermissionEffect; // ALLOW concede, DENY remove
}

export class SetUserOverridesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserOverrideItemDto)
  overrides: UserOverrideItemDto[];
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { UserPermissionOverride } from './user-permission-override.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      RolePermission,
      UserPermissionOverride,
      User,
    ]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [
    PermissionsService,
    TypeOrmModule.forFeature([
      Permission,
      RolePermission,
      UserPermissionOverride,
    ]),
  ],
})
export class PermissionsModule {}

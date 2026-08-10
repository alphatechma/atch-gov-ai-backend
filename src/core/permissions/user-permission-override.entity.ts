import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { PermissionEffect } from '../../shared/enums';
import { Permission } from './permission.entity';
import { User } from '../users/user.entity';

/**
 * Exceções por usuário sobre o padrão do role.
 * effect = ALLOW concede uma permissão que o role não tem;
 * effect = DENY remove uma permissão que o role concederia.
 */
@Entity('user_permission_overrides')
@Unique(['userId', 'permissionId'])
export class UserPermissionOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  permissionId: string;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @Column({ type: 'enum', enum: PermissionEffect })
  effect: PermissionEffect;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

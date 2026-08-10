import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { UserRole } from '../../shared/enums';
import { Permission } from './permission.entity';

/**
 * Permissões PADRÃO de cada papel (role). Define o baseline que todo usuário
 * com aquele role herda. Overrides por usuário são aplicados por cima
 * (ver UserPermissionOverride).
 */
@Entity('role_permissions')
@Unique(['role', 'permissionId'])
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column()
  permissionId: string;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'permissionId' })
  permission: Permission;

  @CreateDateColumn()
  createdAt: Date;
}

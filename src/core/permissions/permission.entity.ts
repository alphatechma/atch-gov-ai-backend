import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { PermissionAction } from '../../shared/enums';

/**
 * Catálogo (seed, imutável) de permissões possíveis no sistema.
 * Uma linha por combinação módulo × ação, ex.: voters:create.
 */
@Entity('permissions')
@Unique(['module', 'action'])
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  module: string;

  @Column({ type: 'enum', enum: PermissionAction })
  action: PermissionAction;

  @Column({ unique: true })
  key: string; // `${module}:${action}` — ex.: 'voters:create'

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}

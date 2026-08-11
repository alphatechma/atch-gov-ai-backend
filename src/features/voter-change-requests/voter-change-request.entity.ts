import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  VoterChangeRequestType,
  VoterChangeRequestStatus,
} from '../../shared/enums/features';

/**
 * Solicitação de alteração (edição ou exclusão) de um eleitor, aberta por uma
 * liderança e submetida à aprovação do ADM. A liderança não muta o eleitor
 * diretamente — as mudanças propostas ficam aqui até serem aprovadas.
 */
@Entity('voter_change_requests')
export class VoterChangeRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /** Eleitor alvo da solicitação. */
  @Index()
  @Column()
  voterId: string;

  /** Liderança dona do eleitor no momento da solicitação (para escopo/filtro). */
  @Column({ type: 'varchar', nullable: true })
  leaderId: string | null;

  /** Usuário (liderança) que abriu a solicitação. */
  @Column()
  requestedById: string;

  @Column({ type: 'enum', enum: VoterChangeRequestType })
  type: VoterChangeRequestType;

  @Column({
    type: 'enum',
    enum: VoterChangeRequestStatus,
    default: VoterChangeRequestStatus.PENDENTE,
  })
  status: VoterChangeRequestStatus;

  /** Campos que a liderança deseja alterar (null quando type = DELETE). */
  @Column({ type: 'jsonb', nullable: true })
  proposedChanges: Record<string, any> | null;

  /** Snapshot dos dados do eleitor no momento do pedido (para diff/auditoria). */
  @Column({ type: 'jsonb', nullable: true })
  snapshotBefore: Record<string, any> | null;

  /** Motivo informado pelo ADM ao rejeitar (volta para a liderança reeditar). */
  @Column({ type: 'text', nullable: true })
  reviewNote: string | null;

  /** ADM que aprovou/rejeitou. */
  @Column({ type: 'varchar', nullable: true })
  reviewedById: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

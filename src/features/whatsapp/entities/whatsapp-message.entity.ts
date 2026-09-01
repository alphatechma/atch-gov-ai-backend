import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum MessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND',
}

export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

@Entity('whatsapp_messages')
@Index(['tenantId', 'remoteJid'])
@Index(['tenantId', 'remotePhone'])
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'connectionId', 'createdAt'])
@Index(['tenantId', 'connectionId', 'remotePhone'])
export class WhatsappMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column()
  connectionId: string;

  @Column()
  remoteJid: string;

  @Column({ nullable: true })
  remoteName: string;

  @Column({ nullable: true })
  remotePhone: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ default: 'text' })
  type: string;

  @Column({
    type: 'enum',
    enum: MessageDirection,
  })
  direction: MessageDirection;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Column({ nullable: true })
  externalId: string;

  @Column({ nullable: true })
  mediaUrl: string;

  /** Original mimetype reported by WhatsApp (the proxy may serve a converted one). */
  @Column({ nullable: true })
  mediaMimetype: string;

  /** Length in seconds for audio/video, so the bubble can label it before loading. */
  @Column({ type: 'int', nullable: true })
  mediaDuration: number | null;

  @Column({ type: 'jsonb', default: [] })
  reactions: { emoji: string; from: string }[];

  @Column({ nullable: true })
  voterId: string;

  @Column({ default: true })
  readByUser: boolean;

  @Column({ default: false })
  replyLater: boolean;

  @Column({ default: false })
  deleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatConversation } from './conversation.entity';

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => ChatConversation, (c) => c.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ChatConversation;

  @Column()
  senderId: string;

  @Column({ nullable: true })
  senderName: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({ nullable: true })
  attachmentName: string;

  @Column({ type: 'jsonb', default: [] })
  readBy: string[];

  @Column({ default: false })
  deleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  // User IDs that deleted this message only for themselves ("apagar para mim")
  @Column({ type: 'jsonb', default: [] })
  deletedFor: string[];

  @CreateDateColumn()
  createdAt: Date;
}

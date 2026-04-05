import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TransactionStatus {
  CREATED = 'CREATED',
  PENDING_AUTH = 'PENDING_AUTH',
  AUTHORIZED = 'AUTHORIZED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  // =========================
  // BCP DATA
  // =========================

  @Column({ type: 'varchar', nullable: true })
  bcpTransactionId: string; // TransactionId del banco

  @Column({ type: 'varchar', length: 5, nullable: true })
  bcpCode: string; // Código de respuesta (00, etc.)

  @Column({ type: 'text', nullable: true })
  bcpMessage: string; // Mensaje del banco

  // =========================
  // BUSINESS DATA
  // =========================

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string; // BOL | USD

  @Column({ type: 'varchar', length: 50 })
  sourceAccount: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // =========================
  // STATUS
  // =========================

  @Column({
    type: 'text',
    default: TransactionStatus.CREATED,
  })
  status: TransactionStatus;

  // =========================
  // PAYLOADS
  // =========================

  @Column({ type: 'json', nullable: true })
  requestPayload: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  responsePayload: Record<string, any>;

  // =========================
  // TIMESTAMPS
  // =========================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  authorizedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}

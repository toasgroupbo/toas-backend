import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Travel } from 'src/modules/travels/entities/travel.entity';

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  AUTHORIZED = 'AUTHORIZED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  // ID que devuelve el BCP
  @Column({ type: 'text', nullable: true })
  transactionId?: string;

  @Column({
    type: 'text',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  //* ============================================================================================== */

  // PROCESS MULTIPLE

  @Column({ type: 'jsonb', nullable: true, select: false })
  processRequest?: any;

  @Column({ type: 'jsonb', nullable: true })
  processResponse?: any;

  // AUTHORIZE BATCH

  @Column({ type: 'jsonb', nullable: true, select: false })
  authorizeRequest?: any;

  @Column({ type: 'jsonb', nullable: true })
  authorizeResponse?: any;

  // GET BATCH DETAIL

  @Column({ type: 'jsonb', nullable: true })
  batchDetailRequest?: any;

  @Column({ type: 'jsonb', nullable: true })
  batchDetailResponse?: any;

  // Historial de errores del banco

  @Column({ type: 'jsonb', nullable: true })
  bankErrors?: any[];
  //* ============================================================================================== */

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  //* ============================================================================================== */

  @Column({ type: 'jsonb', nullable: true })
  travelsSnapshot?: any[];

  //* ============================================================================================== */

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: string;

  @Column({ type: 'int', default: 0 })
  totalTravels: number;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  authorizedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @OneToMany(() => Travel, (travel) => travel.transaction)
  travels: Travel[];
}

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

  @Column()
  companyId: number;

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

  // Lo que enviaste al banco
  @Column({ type: 'jsonb', nullable: true })
  requestPayload?: any;

  // Lo que respondió el banco
  @Column({ type: 'jsonb', nullable: true })
  responsePayload?: any;

  //* ============================================================================================== */

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  //* ============================================================================================== */

  @Column({ type: 'jsonb', nullable: true })
  travelsSnapshot?: any[];

  //* ============================================================================================== */

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

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

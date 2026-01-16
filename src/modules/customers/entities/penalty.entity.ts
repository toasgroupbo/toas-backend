import {
  Column,
  Entity,
  OneToOne,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Customer } from './customer.entity';

@Entity('penalties')
export class Penalty {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 0 })
  failedCount: number;
  @Column({ type: 'timestamp', nullable: true })
  windowStartedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  blockedUntil: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @OneToOne(() => Customer, (customer) => customer.penalty)
  customer: Customer;
}

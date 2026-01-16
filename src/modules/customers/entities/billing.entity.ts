import {
  Column,
  Entity,
  OneToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Customer } from './customer.entity';

@Entity('billings')
export class Billing {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  nombre: string;

  @Column('text', { unique: true })
  ci: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @OneToOne(() => Customer, (customer) => customer.billing)
  customer: Customer;
}

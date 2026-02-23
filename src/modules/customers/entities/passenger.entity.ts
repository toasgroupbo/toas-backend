import {
  Column,
  Entity,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  ManyToMany,
} from 'typeorm';

import { Customer } from './customer.entity';

@Entity('passengers')
export class Passenger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  fullName: string;

  @Column('text', { unique: true })
  ci: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToMany(() => Customer, (customers) => customers.passengers)
  customers: Customer[];
}

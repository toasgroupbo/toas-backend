import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { Customer } from './customer.entity';

@Entity()
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  ci: string;

  @OneToMany(() => Customer, (customer) => customer.person)
  customers: Customer[];
}

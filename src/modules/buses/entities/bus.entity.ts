import {
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import { Equipment } from '../enums';

import { Company } from 'src/modules/companies/entities/company.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';
import { BusType } from './bus-type.entity';

@Entity('buses')
export class Bus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('text', { unique: true }) //! unique
  plaque: string;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  equipment?: Equipment[];

  @Column('text', { nullable: true })
  interior_image: string;

  @Column('text', { nullable: true })
  exterior_image: string;

  @Column('text', { nullable: true })
  brand: string;

  @Column('text', { nullable: true })
  model: string;

  @Column('boolean', { default: false })
  decks: boolean;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Owner, (owner) => owner.buses, { nullable: true }) //! NULL
  owner?: Owner;

  @OneToOne(() => BusType, (busType) => busType.buses, { cascade: true })
  @JoinColumn()
  busType: BusType;

  @ManyToOne(() => Company, (company) => company.buses)
  company: Company;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */
}

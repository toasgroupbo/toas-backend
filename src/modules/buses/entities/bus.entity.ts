import {
  Column,
  Entity,
  OneToOne,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { BusType } from './bus-type.entity';
import { Owner } from 'src/modules/owners/entities/owner.entity';
import { Travel } from 'src/modules/travels/entities/travel.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

export enum Equipment {
  TV = 'tv',
  WIFI = 'wifi',
  TABLET = 'tablet',
  BATHROOM = 'bathroom',
  USB_CHARGER = 'usb_charger',
  AIR_CONDITIONING = 'air_conditioning',
}

@Entity('buses')
export class Bus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  name: string;

  @Column('text', { unique: true })
  plaque: string;

  @Column({
    type: 'text',
    array: true,
  })
  equipment: Equipment[];

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

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Owner, (owner) => owner.buses)
  owner: Owner;

  @OneToOne(() => BusType, (busType) => busType.buses, { cascade: true })
  @JoinColumn()
  busType: BusType;

  @ManyToOne(() => Company, (company) => company.buses)
  company: Company;

  @OneToMany(() => Travel, (travel) => travel.bus)
  travels: Travel[];
}

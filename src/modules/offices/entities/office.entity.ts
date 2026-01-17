import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { CitiesEnum } from '../enums/places.enum';

import { Place } from './place.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Route } from 'src/modules/routes/entities/route.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity('offices')
export class Office {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { nullable: true })
  url_gps: string;

  @Column({
    type: 'text',
  })
  city: CitiesEnum;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(
    () => Company,
    (company) => company.offices,
    //{onDelete: 'SET NULL'},
  )
  company: Company;

  @ManyToOne(() => Place, (place) => place.offices, { eager: true })
  place: Place;

  @OneToMany(() => Route, (route) => route.officeOrigin)
  origenRoutes: Route[];

  @OneToMany(() => Route, (route) => route.officeDestination)
  destinationRoutes: Route[];

  @OneToMany(() => User, (user) => user.office)
  cashiers: User[];
}

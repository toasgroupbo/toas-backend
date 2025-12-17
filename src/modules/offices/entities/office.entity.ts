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

import { Company } from 'src/modules/companies/entities/company.entity';
import { Route } from 'src/modules/routes/entities/route.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { Place } from './place.entity';

@Entity('offices')
export class Office {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { nullable: true })
  url_gps: string;

  @Column({
    type: 'text',
  })
  city: CitiesEnum;

  @CreateDateColumn({ select: false })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(
    () => Company,
    (company) => company.offices /* {
    onDelete: 'SET NULL',
  } */,
  )
  company: Company;

  @ManyToOne(() => Place, (place) => place.offices)
  place: Place;

  @OneToMany(() => Route, (route) => route.officeOrigin)
  origenRoutes: Route[];

  @OneToMany(() => Route, (route) => route.officeDestination)
  destinationRoutes: Route[];

  @OneToMany(() => User, (user) => user.office)
  cashiers: User[];
}

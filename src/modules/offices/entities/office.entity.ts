import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column('text', { nullable: true })
  name: string;

  @Column('text', { nullable: true })
  address: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Company, (company) => company.offices)
  company: Company;

  @ManyToOne(() => Place, (place) => place.offices, { eager: true })
  place: Place;

  @OneToMany(() => Route, (route) => route.officeOrigin, { cascade: true })
  origenRoutes: Route[];

  @OneToMany(() => Route, (route) => route.officeDestination, { cascade: true })
  destinationRoutes: Route[];

  @OneToMany(() => User, (user) => user.office, { cascade: true })
  cashiers: User[];
}

import {
  Column,
  Entity,
  OneToOne,
  ManyToOne,
  OneToMany,
  BeforeInsert,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Rol } from '../../roles/entities/rol.entity';
import { Office } from 'src/modules/offices/entities/office.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { unique: true }) //! unique
  email: string;

  @Column('text', {
    select: false,
  })
  password: string;

  @Column('text')
  fullName: string;

  @Column('text', { unique: true }) //! unique
  ci: string;

  @Column('text')
  phone: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Rol, (rol) => rol.users, {
    onDelete: 'SET NULL',
  })
  rol: Rol;

  //! si es CompanyAdmin
  @OneToOne(() => Company, (company) => company.admin, { nullable: true }) //! NULL
  company?: Company;

  //! si es cajero
  @ManyToOne(() => Office, (office) => office.cashiers, { nullable: true }) //! NULL
  office?: Office;

  @OneToMany(() => Ticket, (ticket) => ticket.soldBy)
  ticketsSold: Ticket[];

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @BeforeInsert()
  hashingPassword() {
    this.password = bcrypt.hashSync(this.password, 10);
  }
}

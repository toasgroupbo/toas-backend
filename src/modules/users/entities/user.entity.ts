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
import { Owner } from 'src/modules/owners/entities/owner.entity';
import { Office } from 'src/modules/offices/entities/office.entity';
import { Ticket } from 'src/modules/tickets/entities/ticket.entity';
import { Company } from 'src/modules/companies/entities/company.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { unique: true })
  email: string;

  @Column('text', {
    select: false,
  })
  password: string;

  @Column('text')
  fullName: string;

  @Column('text', { unique: true })
  ci: string;

  @Column('text')
  phone: string;

  @Column('text', { nullable: true, select: false })
  sessionToken?: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date | null;

  //* ============================================================================================== */
  //*                                        Relations                                               */
  //* ============================================================================================== */

  @ManyToOne(() => Rol, (rol) => rol.users, {
    onDelete: 'SET NULL',
  })
  rol: Rol;

  //! solo para cajeros, dueños y admins de companies
  @ManyToOne(() => Company, (company) => company.users, {
    nullable: true,
  })
  company?: Company;

  //! si es cajero
  @ManyToOne(() => Office, (office) => office.cashiers, { nullable: true })
  office?: Office;

  //! si es owner
  @ManyToOne(() => Owner, (owner) => owner.users, { nullable: true })
  owner?: Owner;

  @OneToMany(() => Ticket, (ticket) => ticket.soldBy)
  ticketsSold: Ticket[];

  //* ============================================================================================== */
  //*                                        Functions                                               */
  //* ============================================================================================== */

  @BeforeInsert()
  hashingPassword() {
    this.password = bcrypt.hashSync(this.password, 10);
  }
}

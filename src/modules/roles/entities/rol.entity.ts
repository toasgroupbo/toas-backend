import {
  Entity,
  Column,
  OneToMany,
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Permission } from './permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true }) //! unique
  name: string;

  @Column({ type: 'boolean', default: false })
  isStatic: boolean; //! indica si es inmutable

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @OneToMany(() => User, (user) => user.rol)
  users: User[];

  @OneToMany(() => Permission, (permission) => permission.rol, {
    cascade: true,
    eager: true,
  })
  permissions: Permission[];
}

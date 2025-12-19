import {
  Entity,
  Unique,
  Column,
  ManyToOne,
  BeforeInsert,
  BeforeUpdate,
  DeleteDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import {
  ValidResourses,
  ValidPermissions,
  ValidResoursesForAdmins,
} from '../../../common/enums';

import { Rol } from './rol.entity';

@Entity('permissions')
@Unique(['rol', 'resourse']) //! Unicidad por rol y recurso
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'text',
  })
  resourse: ValidResourses | ValidResoursesForAdmins; //* Ej: 'users', 'products', etc.

  @Column({
    type: 'text',
    array: true,
    default: [],
  })
  permissions: ValidPermissions[]; //* Ej: 'create', 'update', etc.

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;

  @DeleteDateColumn({ nullable: true, select: false })
  deletedAt: Date;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Relations                                               */
  //* ---------------------------------------------------------------------------------------------- */

  @ManyToOne(() => Rol, (rol) => rol.permissions, {
    onDelete: 'CASCADE',
  })
  rol: Rol;

  //* ---------------------------------------------------------------------------------------------- */
  //*                                        Functions                                               */
  //* ---------------------------------------------------------------------------------------------- */

  //! Elimina duplicados en el array de permisos
  @BeforeInsert()
  @BeforeUpdate()
  removeDuplicates() {
    this.permissions = [...new Set(this.permissions)];
  }
}

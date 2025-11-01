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

import { ValidResourses, ValidPermissions } from '../../../common/enums';

import { Rol } from './rol.entity';

@Entity('permissions')
@Unique(['rol', 'resourse']) //! para que no se repita la combinacion de rol y recurso
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ValidResourses,
  })
  resourse: ValidResourses; // Ej: 'users', 'products', etc.

  @Column({
    type: 'enum',
    enum: ValidPermissions,
    array: true,
    default: [],
  })
  permissions: ValidPermissions[]; // Ej: 'create', 'update', etc.

  @CreateDateColumn({ select: false })
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOwnerDto, UpdateOwnerDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { User } from '../users/entities/user.entity';
import { Owner } from './entities/owner.entity';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createOwnerDto: CreateOwnerDto, user: User) {
    try {
      const { bankAccount, ...data } = createOwnerDto;

      const owner = this.ownerRepository.create({
        ...data,
        bankAccount, //! se crea la cuenta de banco
        company: user.company, //! se añade la company del user que crea el owner
      });
      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //! solo trae los owners de la company del user

  async findAll(user: User) {
    const owners = await this.ownerRepository.find({
      where: { company: user.company },
      relations: { bankAccount: true },
    });

    return owners;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //! solo trae los owners de la company del user

  async findOne(id: string, user: User) {
    const owner = await this.ownerRepository.findOne({
      where: { id, company: user.company },
      relations: { bankAccount: true },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    return owner;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateOwnerDto: UpdateOwnerDto, user: User) {
    const owner = await this.findOne(id, user);
    try {
      Object.assign(owner, updateOwnerDto);
      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string, user: User) {
    const owner = await this.findOne(id, user);
    try {
      await this.ownerRepository.softRemove(owner);
      return {
        message: 'Owner deleted successfully',
        deleted: owner,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}

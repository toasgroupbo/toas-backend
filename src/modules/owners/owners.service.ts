import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

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

  async create(createOwnerDto: CreateOwnerDto) {
    try {
      const { bankAccount, ...data } = createOwnerDto;

      const owner = this.ownerRepository.create({
        ...data,
        bankAccount, //! se crea la cuenta de banco
      });
      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(pagination: PaginationDto) {
    //
    const owners = await this.ownerRepository.find({
      //take: limit,
      //skip: offset,
      relations: { bankAccount: true },
    });

    return owners;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string) {
    const owner = await this.ownerRepository.findOne({
      where: { id },
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

  async update(id: string, updateOwnerDto: UpdateOwnerDto) {
    const owner = await this.findOne(id);
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

  async remove(id: string) {
    const owner = await this.findOne(id);
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

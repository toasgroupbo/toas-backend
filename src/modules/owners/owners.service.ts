import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOwnerDto, UpdateOwnerDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { Owner } from './entities/owner.entity';
import { Bus } from '../buses/entities/bus.entity';

@Injectable()
export class OwnersService {
  constructor(
    @InjectRepository(Owner)
    private readonly ownerRepository: Repository<Owner>,

    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createOwnerDto: CreateOwnerDto, companyUUID: string) {
    try {
      const { bankAccount, ci, ...data } = createOwnerDto;

      // --------------------------------------------------------------------------
      // 1. Buscar si existe un owner con el mismo CI
      // --------------------------------------------------------------------------

      let owner = await this.ownerRepository.findOne({
        where: { ci },
        relations: { companies: true, bankAccount: true },
      });

      // --------------------------------------------------------------------------
      // 2. Si no existiera se crea uno nuevo owner
      // --------------------------------------------------------------------------

      if (!owner) {
        owner = this.ownerRepository.create({
          ...data,
          ci,
          bankAccount, // se crea la cuenta de banco
          companies: [{ id: companyUUID }], // se asigna la primera compañía
        });

        return await this.ownerRepository.save(owner);
      }

      // --------------------------------------------------------------------------
      // 3. Si ya existiera, se agrega la nueva company
      // --------------------------------------------------------------------------

      const companyAlreadyAdded = owner.companies.some(
        (c) => c.id === companyUUID,
      );

      if (!companyAlreadyAdded) {
        owner.companies.push({ id: companyUUID } as any);
      }

      // --------------------------------------------------------------------------
      // 4. Actualizar los datos del owner existente
      // --------------------------------------------------------------------------

      Object.assign(owner, data);

      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(companyUUID: string) {
    const owners = await this.ownerRepository.find({
      where: {
        companies: { id: companyUUID },
        buses: { company: { id: companyUUID } },
      },
      relations: { bankAccount: true, buses: true },
    });

    return owners;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string, companyUUID: string) {
    const owner = await this.ownerRepository.findOne({
      where: { id, companies: { id: companyUUID } },
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

  async update(
    id: string,
    updateOwnerDto: UpdateOwnerDto,
    companyUUID: string,
  ) {
    const owner = await this.findOne(id, companyUUID);
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

  async remove(id: string, companyUUID: string) {
    const owner = await this.findOne(id, companyUUID);

    // --------------------------------------------------------------------------
    // 1. SoftDelete de buses asociados al owner en esa company
    // --------------------------------------------------------------------------

    await this.busRepository
      .createQueryBuilder()
      .softDelete()
      .where('ownerId = :id', { id })
      .andWhere('companyId = :companyUUID', { companyUUID })
      .execute();

    // --------------------------------------------------------------------------
    // 2. Delete de relación Owner - Company
    // --------------------------------------------------------------------------

    await this.ownerRepository
      .createQueryBuilder()
      .relation(Owner, 'companies')
      .of(id)
      .remove(companyUUID);

    return { message: 'Owner deleted successfully', deleted: owner };
  }
}

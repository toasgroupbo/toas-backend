import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { CreateOwnerDto, UpdateOwnerDto } from './dto';

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

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  async create(createOwnerDto: CreateOwnerDto, companyId: number) {
    try {
      const { bankAccount, ci, ...data } = createOwnerDto;

      // --------------------------------------------
      // 1. Buscar si existe un owner con el mismo CI
      // --------------------------------------------

      let owner = await this.ownerRepository.findOne({
        where: { ci },
        relations: { companies: true, bankAccount: true },
      });

      // --------------------------------------------
      // 2. Si no existiera se crea uno nuevo owner
      // --------------------------------------------

      if (!owner) {
        owner = this.ownerRepository.create({
          ...data,
          ci,
          bankAccount, //* se crea la cuenta de banco
          companies: [{ id: companyId }], //* se asigna la primera compañía
        });

        return await this.ownerRepository.save(owner);
      }

      // --------------------------------------------
      // 3. Si ya existiera, se agrega la nueva company
      // --------------------------------------------

      const companyAlreadyAdded = owner.companies.some(
        (c) => c.id === companyId,
      );

      if (!companyAlreadyAdded) {
        owner.companies.push({ id: companyId } as any);
      }

      // --------------------------------------------
      // 4. Actualizar los datos del owner existente
      // --------------------------------------------

      Object.assign(owner, data);

      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  async findAll(companyId: number) {
    const owners = await this.ownerRepository.find({
      where: {
        companies: { id: companyId },
        buses: { company: { id: companyId } },
      },
      relations: { bankAccount: true, buses: true },
    });

    return owners;
  }

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  async findOne(id: number, companyId: number) {
    const owner = await this.ownerRepository.findOne({
      where: { id, companies: { id: companyId } },
      relations: { bankAccount: true },
    });
    if (!owner) {
      throw new NotFoundException('Owner not found');
    }
    return owner;
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  async update(id: number, updateOwnerDto: UpdateOwnerDto, companyId: number) {
    const owner = await this.findOne(id, companyId);
    try {
      Object.assign(owner, updateOwnerDto);
      return await this.ownerRepository.save(owner);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  async remove(id: number, companyId: number) {
    const owner = await this.findOne(id, companyId);

    // --------------------------------------------
    // 1.  buses asociados al owner en esa company
    // --------------------------------------------

    await this.busRepository
      .createQueryBuilder()
      .softDelete()
      .where('ownerId = :id', { id })
      .andWhere('companyId = :companyId', { companyId })
      .execute();

    // --------------------------------------------
    // 2. Delete de relación Owner - Company
    // --------------------------------------------

    await this.ownerRepository
      .createQueryBuilder()
      .relation(Owner, 'companies')
      .of(id)
      .remove(companyId);

    return { message: 'Owner deleted successfully', deleted: owner };
  }
}

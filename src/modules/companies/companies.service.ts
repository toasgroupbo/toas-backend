import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCompanyDto, UpdateCompanyDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { StaticRoles } from 'src/auth/enums/roles.enum';

import { RolesService } from '../roles/roles.service';

import { User } from '../users/entities/user.entity';
import { Company } from './entities/company.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly rolService: RolesService,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      const { bankAccount, manager, ...data } = createCompanyDto;

      // --------------------------------------------------------------------------
      // 1. Busqueda del rol de COMPANY_ADMIN
      // --------------------------------------------------------------------------

      const rol = await this.rolService.findOneByName(
        StaticRoles.COMPANY_ADMIN,
      );
      if (!rol) {
        throw new NotFoundException('Role COMPANY_ADMIN not found');
      }

      // --------------------------------------------------------------------------
      // 2. Creacion de la compania
      // --------------------------------------------------------------------------

      const newCompany = this.companyRepository.create({
        ...data,
        admin: { ...manager, rol: rol }, //! se crea el admin de la compania
        bankAccount,
      });

      return await this.companyRepository.save(newCompany);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll() {
    const companies = await this.companyRepository.find({
      relations: { bankAccount: true, admin: true },
    });
    return companies;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findOne(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: { bankAccount: true, admin: true },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    const company = await this.findOne(id);
    try {
      Object.assign(company, updateCompanyDto);
      return await this.companyRepository.save(company);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async remove(id: string) {
    const company = await this.findOne(id);

    // --------------------------------------------------------------------------
    // 1. SoftDelete de Admin de la company
    // --------------------------------------------------------------------------

    await this.userRepository
      .createQueryBuilder()
      .softDelete()
      .where('id = :id', { id: company.admin.id })
      .execute();

    // --------------------------------------------------------------------------
    // 2. Delete de la company
    // --------------------------------------------------------------------------

    await this.companyRepository
      .createQueryBuilder()
      .softDelete()
      .where('id = :id', { id: company.id })
      .execute();

    return { message: 'Company deleted successfully', deleted: company };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';

import { handleDBExceptions } from 'src/common/helpers/handleDBExceptions';

import { StaticRoles } from 'src/auth/enums/roles.enum';

import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

import { Company } from './entities/company.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly userService: UsersService,

    private readonly rolService: RolesService,
  ) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  async create(createCompanyDto: CreateCompanyDto) {
    try {
      const { bankAccount, manager, ...data } = createCompanyDto;

      //! busqueda del rol de COMPANY_ADMIN
      const rol = await this.rolService.findOneByName(
        StaticRoles.COMPANY_ADMIN,
      );
      if (!rol) {
        throw new NotFoundException('Role COMPANY_ADMIN not found');
      }

      //! creacion de la compania
      const newCompany = this.companyRepository.create({
        ...data,
        admin: { ...manager, rol: rol }, //! se crea el usuario admin de la compania
        bankAccount, //! se crea la cuenta de banco
      });

      return await this.companyRepository.save(newCompany);
    } catch (error) {
      handleDBExceptions(error);
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  async findAll(pagination: PaginationDto) {
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

    try {
      await this.companyRepository.softRemove(company);
      return {
        message: 'Company deleted successfully',
        deleted: company,
      };
    } catch (error) {
      handleDBExceptions(error);
    }
  }
}

import { Get, Post, Body, Patch, Param, Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { UpdateCommissionDto } from './dto/update-commission.dto';

import { CommissionsService } from './commissions.service';

//!
@Resource(ValidResourses.COMMISSION)
@ApiBearerAuth('access-token')
//!

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  @Post()
  create() {
    return this.commissionsService.create();
  }

  //? ============================================================================================== */
  //?                                       FindAll                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ_ADMIN)
  //!
  @Get()
  findAll() {
    return this.commissionsService.findAll();
  }

  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ_COMPANY)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Get('company')
  findAllForCompany(@GetCompany() companyId: number) {
    return this.commissionsService.findAllForCompany(companyId);
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE_ADMIN)
  //!
  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() updateCommissionDto: UpdateCommissionDto,
  ) {
    return this.commissionsService.update(id, updateCommissionDto);
  }
}

import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Controller,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { ValidPermissions, ValidResourses } from 'src/common/enums';
import { CommissionPaginationDto } from './pagination/commission.pagination';

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

  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'isPaid',
    required: false,
    type: Boolean,
  })

  //!
  @Auth(ValidPermissions.READ_ADMIN)
  //!
  @Get()
  findAll(@Query() filters: CommissionPaginationDto) {
    return this.commissionsService.findAll(filters);
  }

  //? ============================================================================================== */

  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  //@ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'isPaid',
    required: false,
    type: Boolean,
  })

  //!
  @Auth(ValidPermissions.READ_COMPANY)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number }) //! GetCompany
  @Get('company')
  findAllForCompany(
    @GetCompany() companyId: number,

    @Query() filters: CommissionPaginationDto,
  ) {
    return this.commissionsService.findAllForCompany(companyId, filters);
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

import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Controller,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateBusDto, UpdateBusDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { BusesService } from './buses.service';

//!
@Resource(ValidResourses.BUS)
@ApiBearerAuth('access-token')
//!

@ApiTags('Buses')
@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  //? ============================================================================================== */
  //?                                        Create                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Post()
  create(@Body() createBusDto: CreateBusDto, @GetCompany() companyId: number) {
    return this.busesService.create(createBusDto, companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                        FindAll                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Get()
  findAll(@GetCompany() companyId: number) {
    return this.busesService.findAll(companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //? ============================================================================================== */

  /*//!
  @Resource(ValidResourses.CASHIER_BUS)
  @Auth(ValidPermissions.READ)
  @ApiBearerAuth('access-token')
  //!
  @Get('cashier')
  findAllBusesforCashier(@GetOffice() office: Office) {
    return this.busesService.findAllforCashier(office); //! GetOffice object
  }*/

  //? ============================================================================================== */
  //?                                        FindOne                                                 */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.busesService.findOne(id, companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                        Update                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBusDto: UpdateBusDto,
    @GetCompany() companyId: number,
  ) {
    return this.busesService.update(id, updateBusDto, companyId); //! GetCompany
  }

  //? ============================================================================================== */
  //?                                        Delete                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetCompany() companyId: number,
  ) {
    return this.busesService.remove(id, companyId); //! GetCompany
  }
}

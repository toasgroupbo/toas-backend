import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Controller,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateBusDto, UpdateBusDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetCompany, GetUser, Resource } from 'src/auth/decorators';

import { BusesService } from './buses.service';

//!
@Resource(ValidResourses.BUS)
@ApiBearerAuth('access-token')
//!

@ApiTags('Buses')
@Controller('buses')
export class BusesController {
  constructor(private readonly busesService: BusesService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() createBusDto: CreateBusDto) {
    return this.busesService.create(createBusDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Get()
  findAll(@GetCompany() companyUUID: string) {
    return this.busesService.findAll(companyUUID); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCompany() companyUUID: string,
  ) {
    return this.busesService.findOne(id, companyUUID); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBusDto: UpdateBusDto,
    @GetCompany() companyUUID: string,
  ) {
    return this.busesService.update(id, updateBusDto, companyUUID); //! GetCompany
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCompany() companyUUID: string,
  ) {
    return this.busesService.remove(id, companyUUID); //! GetCompany
  }
}

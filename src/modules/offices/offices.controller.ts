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

import { CreateOfficeDto, UpdateOfficeDto } from './dto';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { Auth, GetCompany, Resource } from 'src/auth/decorators';

import { OfficesService } from './offices.service';

//!
@Resource(ValidResourses.OFFICE)
@ApiBearerAuth('access-token')
//!

@ApiTags('Offices')
@Controller('offices')
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @ApiQuery({ name: 'companyUUID', required: false, type: String })
  @Post()
  create(
    @Body() createOfficeDto: CreateOfficeDto,
    @GetCompany() companyUUID: string,
  ) {
    return this.officesService.create(createOfficeDto, companyUUID); //! GetCompany
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
    return this.officesService.findAll(companyUUID); //! GetCompany
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
    return this.officesService.findOne(id, companyUUID); //! GetCompany
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
    @Body() updateOfficeDto: UpdateOfficeDto,
    @GetCompany() companyUUID: string,
  ) {
    return this.officesService.update(id, updateOfficeDto, companyUUID); //! GetCompany
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
    return this.officesService.remove(id, companyUUID); //! GetCompany
  }
}

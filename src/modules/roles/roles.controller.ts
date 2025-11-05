import {
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Controller,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CreateRoleDto, UpdateRoleDto } from './dto';

import { ValidResourses, ValidPermissions } from '../../common/enums';

import { Auth, Resource } from '../../auth/decorators';

//!
@Resource(ValidResourses.ROL)
@ApiBearerAuth('access-token')
//!

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Create                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.CREATE)
  //!
  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindAll                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        FindOne                                                 */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.READ)
  //!
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Update                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.UPDATE)
  //!
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(+id, updateRoleDto);
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Delete                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  //!
  @Auth(ValidPermissions.DELETE)
  //!
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }
}

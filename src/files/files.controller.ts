import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Res,
  Delete,
  Body,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { diskStorage } from 'multer';

import { fileFilter } from './helpers/fileFilter.helper';
import { fileNamer } from './helpers/fileNamer.helper';

import { ValidPermissions, ValidResourses } from 'src/common/enums';

import { FilesService } from './files.service';
import { Auth, Resource } from 'src/auth/decorators';

//!
@Resource(ValidResourses.FILE)
//!

@ApiTags('Files')
@Controller('multimedia')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  //? ============================================================================================== */
  //?                                        Upload                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  @ApiBearerAuth('access-token')
  //!
  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB en bytes
      fileFilter: fileFilter,
      storage: diskStorage({
        destination: './static/uploads',
        filename: fileNamer,
      }),
    }),
  )
  upload(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Make sure that at least one file was uploaded',
      );
    }
    return this.filesService.getSecureUrl(files);
  }

  //? ============================================================================================== */
  //?                                      GetFiles                                                  */
  //? ============================================================================================== */

  @Get('/upload/:file')
  getFile(@Res() res: Response, @Param('file') file: string) {
    const path = this.filesService.getFile(file);
    res.sendFile(path);
  }

  //? ============================================================================================== */
  //?                                   GetAllFiles                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.READ)
  @ApiBearerAuth('access-token')
  //!
  @Get('uploads')
  getAllFiles() {
    return this.filesService.getAllFiles();
  }

  //? ============================================================================================== */
  //?                                  deletedFiles                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.DELETE)
  @ApiBearerAuth('access-token')
  //!
  @Delete()
  deleteFiles(@Body() deleteDto: string[]) {
    return this.filesService.deletedFiles(deleteDto);
  }

  //? ============================================================================================== */
  //?                                  deletedFiles                                                  */
  //? ============================================================================================== */

  //!
  @Auth(ValidPermissions.CREATE)
  @ApiBearerAuth('access-token')
  //!
  @Post('upload-cert')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: diskStorage({
        destination: './static/certs',
        filename: (req, file, callback) => {
          callback(null, 'bcp_cert_prueba.pfx');
        },
      }),
    }),
  )
  uploadCert(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debe subir un archivo .pfx');
    }

    return { message: 'Certificado subido correctamente' };
  }
}

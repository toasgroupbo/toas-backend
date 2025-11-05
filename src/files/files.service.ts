import { BadRequestException, Injectable } from '@nestjs/common';

import * as path from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { readdir } from 'fs/promises';

import { envs } from 'src/config/environments/environments';

@Injectable()
export class FilesService {
  private uploadPath = path.resolve('./static/uploads/');

  //? ---------------------------------------------------------------------------------------------- */
  //?                                        Upload                                                  */
  //? ---------------------------------------------------------------------------------------------- */

  getSecureUrl(files: Express.Multer.File[]): string[] {
    //const hostApi = envs.HOST;
    return files.map(
      (file) => /* `${hostApi} */ `/api/multimedia/upload/${file.filename}`,
    );
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                      GetFile                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  getFile(fileName: string) {
    const pathFile = path.resolve('./static/uploads', fileName);
    if (!existsSync(pathFile)) throw new BadRequestException('File not found');
    return pathFile;
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                 deletedFiles                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  async deletedFiles(multimediaFiles: string[] | undefined) {
    if (!multimediaFiles || multimediaFiles.length === 0) return;

    for (const multimediaFile of multimediaFiles) {
      const fileName = multimediaFile.split('/').pop();
      if (!fileName) continue;

      const filePath = path.join(this.uploadPath, fileName);

      try {
        await fs.access(filePath); //! Verifica si existe
        await fs.unlink(filePath); //! Lo elimina
      } catch {
        //! Si no existe o falla, simplemente se ignora
      }
    }
  }

  //? ---------------------------------------------------------------------------------------------- */
  //?                                  GetAllFiles                                                   */
  //? ---------------------------------------------------------------------------------------------- */

  async getAllFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.uploadPath);
      const filePaths = files.map((file) => file);

      return filePaths;
    } catch (error) {
      console.error(error);
      throw new Error('No se pudo leer la carpeta de uploads');
    }
  }
}

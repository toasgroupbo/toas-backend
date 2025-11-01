import { v4 as uuid } from 'uuid';

export const fileNamer = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: Function,
) => {
  if (!file) return callback(new Error('file is empty'), false); // si false no lo pasa al controlador

  const fileExtension = file.mimetype.split('/')[1].toLowerCase();

  callback(null, uuid() + '.' + fileExtension);
};

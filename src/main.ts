import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { envs } from './config/environments/environments';
import { setupSwagger } from './config/swagger/swagger.config';

async function main() {
  //! errores de version de node en dockploy
  if (!globalThis.crypto) {
    // @ts-ignores
    globalThis.crypto = { randomUUID };
  }

  const app = await NestFactory.create(AppModule);

  const logger = new Logger('TOAS');

  //! cors global enable
  app.enableCors();

  app.setGlobalPrefix('api');

  setupSwagger(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(envs.PORT ?? process.env.PORT);
  logger.log(`🚀 Server is running on: http://localhost:${envs.PORT}/api`);
}
main();

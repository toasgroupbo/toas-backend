import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { envs } from './config/environments/environments';
import { randomUUID } from 'crypto';
import { setupSwagger } from './config/swagger/swagger.config';

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const logger = new Logger('TOAS');

  //! errores de version de node en dockploy
  if (!globalThis.crypto) {
    // @ts-ignores
    globalThis.crypto = { randomUUID };
  }

  //! cors global enable
  app.enableCors();

  //! IP real del cliente detrás del proxy (la usa el rate limit de login/2fa)
  app.set('trust proxy', envs.TRUST_PROXY_HOPS);

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

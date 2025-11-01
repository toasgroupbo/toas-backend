import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { envs } from './config/environments/environments';
import { setupSwagger } from './config/swagger/swagger.config';

async function main() {
  const app = await NestFactory.create(AppModule);

  const logger = new Logger('TRANET');

  //! cors global enable
  app.enableCors();

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

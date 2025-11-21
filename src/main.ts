import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { buildSwagger } from './swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger habilitado en desarrollo o si ENABLE_SWAGGER=true
  if (
    process.env.ENABLE_SWAGGER === 'true' ||
    (process.env.NODE_ENV ?? 'development') !== 'production'
  ) {
    const doc = buildSwagger(app);
    SwaggerModule.setup('docs', app, doc);
  }

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();

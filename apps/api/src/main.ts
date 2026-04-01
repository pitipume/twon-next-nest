import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser — needed for HttpOnly refresh token cookie
  app.use(cookieParser());

  // Global validation pipe — equivalent to FluentValidation pipeline in .NET
  // whitelist: strips unknown properties (security)
  // transform: runs @Transform decorators on DTOs (e.g. toLowerCase)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — allow frontend origin
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true, // required for cookies
  });

  // Global prefix — all routes under /api
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}
bootstrap();

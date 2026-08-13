// Must load before any other import — modules like `./config/features` read
// process.env at import time, which happens before Nest's ConfigModule (and
// its .env loading) ever runs. Without this, local .env values are invisible
// to anything evaluated at module scope (real env vars from Render/Docker
// aren't affected, since those exist before Node even starts).
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Features } from './config/features';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Twon API')
    .setDescription('Ebook & Tarot shop API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  if (Features.googleAuth && !(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)) {
    console.warn(
      'WARNING: FEATURE_GOOGLE_AUTH_ENABLED=true but GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are not set. ' +
        'Google sign-in will fail with "invalid_client" until these are configured in the environment.',
    );
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();

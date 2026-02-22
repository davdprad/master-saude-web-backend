import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const devOrigins = [
    'http://localhost:3000',
    'http://192.168.15.6:3000',
    'http://192.168.15.9:3000',
  ];

  const configuredOrigins = envOrigins.length > 0 ? envOrigins : devOrigins;
  const corsOrigins = isProduction
    ? configuredOrigins.filter((origin) => origin.startsWith('https://'))
    : configuredOrigins;

  if (isProduction && corsOrigins.length === 0) {
    throw new Error('Defina CORS_ALLOWED_ORIGINS com domínios HTTPS para produção');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Empresa API')
    .setDescription('Documentação da API de Empresas e Funcionários')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, {
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(Number(process.env.PORT ?? 3030));
  logger.log(`NODE_ENV=${process.env.NODE_ENV ?? 'development'} | CORS origins: ${corsOrigins.join(', ')}`);
  logger.log(`API NestJS running on http://localhost:${process.env.PORT ?? 3030}`);
  logger.log(`Swagger disponível em http://localhost:${process.env.PORT ?? 3030}/docs`);
}

void bootstrap();
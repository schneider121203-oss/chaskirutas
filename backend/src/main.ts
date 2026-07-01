import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix all REST endpoints
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('ChaskiRutas API')
    .setDescription(
      'Documentación de la API de ChaskiRutas para el Centro de Operaciones Unificado. Mapeo completo en 3FN del transporte formalizado peruano.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 ChaskiRutas API running on: http://localhost:${port}/api`);
  console.log(`📋 Swagger UI available on: http://localhost:${port}/api/docs`);
}
bootstrap();

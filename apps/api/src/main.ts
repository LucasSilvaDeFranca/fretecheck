import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== 'production' }),
  )

  const config = app.get(ConfigService)

  // Versionamento de API
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })

  // Prefixo global
  app.setGlobalPrefix(config.get('API_PREFIX', 'api'))

  // CORS
  app.enableCors({
    origin: config.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  })

  // Validação global com class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Filtro global de exceções
  app.useGlobalFilters(new HttpExceptionFilter())

  // Swagger (apenas em dev/staging)
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FreteCheck API')
      .setDescription('API de Certificação de Tempo de Espera no Transporte de Fretes')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
    console.log(`📄 Swagger: http://localhost:${config.get('PORT', 3001)}/api/docs`)
  }

  const port = config.get('PORT', 3001)
  await app.listen(port, '0.0.0.0')
  console.log(`🚀 FreteCheck API rodando em: http://localhost:${port}`)
}

bootstrap()

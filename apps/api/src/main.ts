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
    new FastifyAdapter({
      logger: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,reqId',
            messageFormat: '\x1b[36m{msg}\x1b[0m',
            singleLine: true,
          },
        },
      },
    }),
  )

  const config = app.get(ConfigService)

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' })
  app.setGlobalPrefix(config.get('API_PREFIX', 'api'))

  const rawOrigin = config.get('CORS_ORIGIN', 'http://localhost:3000')
  const origins = rawOrigin.split(',').map((o: string) => o.trim())
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.useGlobalFilters(new HttpExceptionFilter())

  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('FreteCheck API')
      .setDescription('API de Certificação de Tempo de Espera no Transporte de Fretes')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = config.get('PORT', 3001)
  await app.listen(port, '0.0.0.0')

  console.log('')
  console.log('\x1b[1m\x1b[38;2;240;90;26m  ███████╗██████╗ ███████╗████████╗███████╗\x1b[0m')
  console.log('\x1b[1m\x1b[38;2;240;90;26m  ██╔════╝██╔══██╗██╔════╝╚══██╔══╝██╔════╝\x1b[0m')
  console.log('\x1b[1m\x1b[38;2;240;90;26m  █████╗  ██████╔╝█████╗     ██║   █████╗  \x1b[0m')
  console.log('\x1b[1m\x1b[38;2;240;90;26m  ██╔══╝  ██╔══██╗██╔══╝     ██║   ██╔══╝  \x1b[0m')
  console.log('\x1b[1m\x1b[38;2;240;90;26m  ██║     ██║  ██║███████╗   ██║   ███████╗\x1b[0m')
  console.log('\x1b[1m\x1b[38;2;240;90;26m  ╚═╝     ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝\x1b[0m')
  console.log('\x1b[38;2;0;201;167m  FreteCheck API v1.0\x1b[0m')
  console.log('')
  console.log(`  \x1b[90m├─\x1b[0m \x1b[1mPorta:\x1b[0m      \x1b[33m${port}\x1b[0m`)
  console.log(`  \x1b[90m├─\x1b[0m \x1b[1mAmbiente:\x1b[0m   \x1b[33m${config.get('NODE_ENV', 'development')}\x1b[0m`)
  console.log(`  \x1b[90m├─\x1b[0m \x1b[1mCORS:\x1b[0m       \x1b[36m${origins.join(', ')}\x1b[0m`)
  console.log(`  \x1b[90m└─\x1b[0m \x1b[1mURL:\x1b[0m        \x1b[36mhttp://localhost:${port}/api/v1\x1b[0m`)
  console.log('')
}

bootstrap()

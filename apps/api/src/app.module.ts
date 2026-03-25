import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ScheduleModule } from '@nestjs/schedule'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { CheckinsModule } from './modules/checkins/checkins.module'
import { TitulosModule } from './modules/titulos/titulos.module'
import { TerminaisModule } from './modules/terminais/terminais.module'
import { UsuariosModule } from './modules/usuarios/usuarios.module'
import { BrasilIdModule } from './modules/integrations/brasil-id/brasil-id.module'
import { CertificadosModule } from './modules/certificados/certificados.module'
import { EmailModule } from './modules/email/email.module'
import { WebhooksModule } from './modules/webhooks/webhooks.module'
import { StorageModule } from './modules/storage/storage.module'

@Module({
  imports: [
    // Configuração de variáveis de ambiente
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Rate limiting: 100 req / 60s por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Jobs agendados (ex: recálculo de score de terminais)
    ScheduleModule.forRoot(),

    // Prisma (banco de dados)
    PrismaModule,

    // Integrações externas
    BrasilIdModule,
    EmailModule,
    WebhooksModule,
    StorageModule,

    // Módulos de negócio
    AuthModule,
    CheckinsModule,
    CertificadosModule,
    TitulosModule,
    TerminaisModule,
    UsuariosModule,
  ],
})
export class AppModule {}

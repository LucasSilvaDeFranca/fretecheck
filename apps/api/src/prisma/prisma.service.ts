import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Prisma')

  constructor() {
    super({
      datasourceUrl: process.env.DATABASE_URL,
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    })
  }

  async onModuleInit() {
    (this as any).$on('warn', (e: { message: string }) => this.logger.warn(e.message))
    ;(this as any).$on('error', (e: { message: string }) => this.logger.error(e.message))

    await this.connectWithRetry()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }

  // Ping a cada 4 min para manter o pooler do Supabase acordado
  @Interval(240_000)
  async keepAlive() {
    try {
      await this.$queryRaw`SELECT 1`
    } catch {
      this.logger.warn('Keep-alive ping failed — reconnecting...')
      try { await this.$connect() } catch {}
    }
  }

  private async connectWithRetry(retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.$connect()
        this.logger.log('Database connected')
        return
      } catch (err) {
        this.logger.warn(`Database connection attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`)
        if (i === retries - 1) throw err
        await new Promise((r) => setTimeout(r, delay))
        delay *= 2
      }
    }
  }
}

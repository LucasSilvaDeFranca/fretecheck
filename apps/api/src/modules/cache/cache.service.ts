import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Redis')
  private client!: Redis

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL')
    if (!url) {
      this.logger.warn('REDIS_URL not set — cache disabled')
      return
    }

    this.client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 3000),
      tls: url.startsWith('rediss://') ? {} : undefined,
    })

    this.client.on('connect', () => this.logger.log('Redis connected'))
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`))
  }

  async onModuleDestroy() {
    if (this.client) await this.client.quit()
  }

  get enabled(): boolean {
    return !!this.client
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null
    try {
      const data = await this.client.get(key)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    if (!this.client) return
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch {}
  }

  async del(pattern: string): Promise<void> {
    if (!this.client) return
    try {
      if (pattern.includes('*')) {
        const keys = await this.client.keys(pattern)
        if (keys.length > 0) await this.client.del(...keys)
      } else {
        await this.client.del(pattern)
      }
    } catch {}
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false
    try {
      const r = await this.client.ping()
      return r === 'PONG'
    } catch {
      return false
    }
  }
}

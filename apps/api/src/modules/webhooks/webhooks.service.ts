import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'
import axios from 'axios'
import { PrismaService } from '../../prisma/prisma.service'

export type WebhookEventType =
  | 'CHECKIN_CREATED'
  | 'CHECKOUT_COMPLETED'
  | 'CERTIFICATE_ISSUED'
  | 'TITULO_GERADO'
  | 'TITULO_PAGO'
  | 'TITULO_CONTESTADO'
  | 'ALERTA_OVERBOOKING'
  | 'SCORE_ATUALIZADO'

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Dispatch a webhook event to all active registered endpoints.
   * Fire-and-forget: does not block the caller.
   */
  dispatch(event: WebhookEventType, payload: Record<string, unknown>): void {
    // Run async without awaiting to avoid blocking request handling
    this.dispatchAsync(event, payload).catch((err) =>
      this.logger.error(`Webhook dispatch error for ${event}: ${err}`),
    )
  }

  private async dispatchAsync(event: WebhookEventType, payload: Record<string, unknown>): Promise<void> {
    const configs = await this.prisma.webhookConfig.findMany({
      where: {
        ativo: true,
        events: { has: event as never },
      },
    })

    if (configs.length === 0) return

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      apiVersion: 'v1',
      data: payload,
    })

    await Promise.allSettled(
      configs.map((cfg) => this.sendToEndpoint(cfg.id, cfg.url, cfg.secret, event, body, payload)),
    )
  }

  private async sendToEndpoint(
    configId: string,
    url: string,
    secret: string,
    event: WebhookEventType,
    body: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const signature = this.sign(body, secret)

    let statusCode: number | null = null
    let responseBody: string | null = null
    let sucesso = false

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-FreteCheck-Signature': `sha256=${signature}`,
          'X-FreteCheck-Event': event,
          'User-Agent': 'FreteCheck-Webhooks/1.0',
        },
        timeout: 10_000,
        validateStatus: () => true, // Don't throw on 4xx/5xx
      })

      statusCode = response.status
      responseBody = typeof response.data === 'string' ? response.data.substring(0, 500) : JSON.stringify(response.data).substring(0, 500)
      sucesso = response.status >= 200 && response.status < 300

      if (!sucesso) {
        this.logger.warn(`Webhook ${event} → ${url} returned ${statusCode}`)
      }
    } catch (err) {
      const msg = (err as { message?: string }).message ?? String(err)
      responseBody = msg.substring(0, 500)
      this.logger.error(`Webhook ${event} → ${url} failed: ${msg}`)
    }

    await this.prisma.webhookLog.create({
      data: {
        configId,
        event: event as never,
        payload: payload as never,
        statusCode,
        responseBody,
        tentativas: 1,
        sucesso,
      },
    })
  }

  private sign(body: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex')
  }

  // ─── Management endpoints ─────────────────────────────────────────────────

  async createConfig(
    userId: string | null,
    empresaId: string | null,
    url: string,
    events: WebhookEventType[],
  ) {
    const secret = crypto.randomBytes(32).toString('hex')
    return this.prisma.webhookConfig.create({
      data: {
        url,
        secret,
        events: events as never[],
        userId,
        empresaId,
      },
      select: { id: true, url: true, events: true, secret: true, ativo: true, createdAt: true },
    })
  }

  async listConfigs(userId: string) {
    return this.prisma.webhookConfig.findMany({
      where: { userId },
      select: { id: true, url: true, events: true, ativo: true, createdAt: true },
    })
  }

  async deleteConfig(id: string, userId: string) {
    const cfg = await this.prisma.webhookConfig.findUnique({ where: { id } })
    if (!cfg || cfg.userId !== userId) return null
    return this.prisma.webhookConfig.delete({ where: { id } })
  }
}

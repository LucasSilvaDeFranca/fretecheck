import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private readonly baseUrl = 'https://api.brevo.com/v3'

  constructor(private config: ConfigService) {}

  private get apiKey() {
    return this.config.get<string>('BREVO_API_KEY') ?? ''
  }

  private get fromEmail() {
    return this.config.get<string>('BREVO_FROM_EMAIL', 'noreply@fretecheck.com.br')
  }

  private get fromName() {
    return this.config.get<string>('BREVO_FROM_NAME', 'FreteCheck')
  }

  async sendTransactional(to: string, subject: string, htmlContent: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[DEV] Email → ${to} | ${subject}`)
      return
    }

    try {
      await axios.post(
        `${this.baseUrl}/smtp/email`,
        {
          sender: { name: this.fromName, email: this.fromEmail },
          to: [{ email: to }],
          subject,
          htmlContent,
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      )
      this.logger.log(`Email sent to ${to}: ${subject}`)
    } catch (err) {
      const msg = (err as { message?: string }).message ?? String(err)
      this.logger.error(`Failed to send email to ${to}: ${msg}`)
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[DEV] OTP para ${email}: ${code}`)
    }
    const subject = 'Seu código de verificação — FreteCheck'
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="background:#1E3A5F;padding:20px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-size:20px;font-weight:bold">FreteCheck</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:32px 24px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px;color:#111827;font-size:18px">Código de verificação</h2>
          <p style="color:#6B7280;margin:0 0 24px;font-size:14px">
            Use o código abaixo para entrar na sua conta. Válido por 5 minutos.
          </p>
          <div style="background:#F3F4F6;border-radius:8px;padding:20px;text-align:center;letter-spacing:0.5em;font-size:32px;font-weight:bold;color:#1E3A5F;font-family:monospace">
            ${code}
          </div>
          <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0">
            Se você não solicitou este código, ignore este email.
          </p>
        </div>
      </div>
    `
    await this.sendTransactional(email, subject, html)
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(private config: ConfigService) {}

  async sendText(to: string, message: string): Promise<void> {
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN')
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')

    if (!accessToken || !phoneNumberId) {
      // Dev mode: just log the message
      this.logger.debug(`[DEV] WhatsApp → ${to}: ${message}`)
      return
    }

    try {
      await axios.post(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      )
      this.logger.log(`WhatsApp message sent to ${to}`)
    } catch (err) {
      const msg = (err as { message?: string }).message ?? String(err)
      this.logger.error(`Failed to send WhatsApp message to ${to}: ${msg}`)
      // Don't throw — OTP sending failure should not crash the request
    }
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const msg =
      `*FreteCheck* — Seu código de verificação é: *${code}*\n\n` +
      `Válido por 5 minutos. Não compartilhe com ninguém.`
    await this.sendText(phone, msg)
  }

  async sendCheckinConfirmation(phone: string, placa: string, checkinId: string): Promise<void> {
    const msg =
      `✅ *Check-in registrado!*\n\n` +
      `Placa: *${placa}*\n` +
      `ID: ${checkinId}\n\n` +
      `Agora registre o apontamento informando a causa do atraso.\n` +
      `Acesse: https://app.fretecheck.com.br/motorista/checkin/${checkinId}`
    await this.sendText(phone, msg)
  }

  async sendCheckoutSummary(
    phone: string,
    placa: string,
    tempoEsperaMin: number,
    tempoExcedenteMin: number,
    valorEstimado: string,
    checkinId: string,
  ): Promise<void> {
    const h = Math.floor(tempoEsperaMin / 60)
    const m = tempoEsperaMin % 60
    const duracaoStr = h > 0 ? `${h}h ${m}min` : `${m}min`
    const tempoExcStr = tempoExcedenteMin > 0 ? `${tempoExcedenteMin}min` : 'Sem excedente'
    const valorStr =
      Number(valorEstimado) > 0
        ? `R$ ${Number(valorEstimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'R$ 0,00'

    const msg =
      `🏁 *Saída registrada!*\n\n` +
      `Placa: *${placa}*\n` +
      `Tempo total: ${duracaoStr}\n` +
      `Tempo excedente: ${tempoExcStr}\n` +
      `Valor estimado: *${valorStr}*\n\n` +
      `Para emitir o certificado acesse:\n` +
      `https://app.fretecheck.com.br/motorista/checkin/${checkinId}`
    await this.sendText(phone, msg)
  }

  async sendCertificadoEmitido(phone: string, numero: string, pdfUrl: string): Promise<void> {
    const msg =
      `🏆 *Certificado emitido!*\n\n` +
      `Número: *${numero}*\n\n` +
      `Baixe seu certificado PDF:\n${pdfUrl}`
    await this.sendText(phone, msg)
  }
}

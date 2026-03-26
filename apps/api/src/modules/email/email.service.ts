import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'

const BRAND = '#1E3A5F'
const ACCENT = '#F59E0B'
const GRAY = '#6B7280'
const LIGHT_BG = '#F3F4F6'
const DARK_TEXT = '#111827'

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

  // ─── Wrapper base (mesma estilização do PDF) ─────────────────────────────────

  private wrap(body: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">

  <!-- Header -->
  <tr><td style="background:${BRAND};padding:24px 32px">
    <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td><span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:-0.5px">Frete</span><span style="color:${ACCENT};font-size:22px;font-weight:bold;letter-spacing:-0.5px">Check</span></td>
    </tr>
    </table>
  </td></tr>

  <!-- Accent line -->
  <tr><td style="background:${ACCENT};height:3px;font-size:0;line-height:0">&nbsp;</td></tr>

  <!-- Body -->
  <tr><td style="padding:32px">
    ${body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:${ACCENT};height:2px;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center">
    <p style="margin:0 0 4px;color:${GRAY};font-size:11px">FreteCheck &mdash; Certificação de Tempo de Espera no Transporte</p>
    <p style="margin:0;color:${GRAY};font-size:11px">Lei 11.442/2007 &middot; Art. 11 &middot; ICP-Brasil (MP 2.200-2/2001)</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
  }

  // ─── Send ────────────────────────────────────────────────────────────────────

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
      const axiosErr = err as { response?: { data?: unknown; status?: number }; message?: string }
      const detail = axiosErr.response?.data ? JSON.stringify(axiosErr.response.data) : axiosErr.message ?? String(err)
      this.logger.error(`Failed to send email to ${to} (${axiosErr.response?.status}): ${detail}`)
    }
  }

  // ─── OTP (código de verificação) ─────────────────────────────────────────────

  async sendOtp(email: string, code: string): Promise<void> {
    const subject = 'Seu código de verificação — FreteCheck'
    const body = `
      <h2 style="margin:0 0 8px;color:${DARK_TEXT};font-size:18px;font-weight:bold">Código de verificação</h2>
      <p style="color:${GRAY};margin:0 0 24px;font-size:14px;line-height:1.5">
        Use o código abaixo para acessar sua conta.<br>Ele é válido por <strong>5 minutos</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <div style="background:${LIGHT_BG};border-radius:8px;padding:20px 32px;display:inline-block;letter-spacing:0.5em;font-size:32px;font-weight:bold;color:${BRAND};font-family:'Courier New',monospace">
          ${code}
        </div>
      </td></tr>
      </table>
      <p style="color:${GRAY};font-size:12px;margin:24px 0 0;line-height:1.5">
        Se você não solicitou este código, ignore este email.
      </p>
    `
    await this.sendTransactional(email, subject, this.wrap(body))
  }

  // ─── Boas-vindas ─────────────────────────────────────────────────────────────

  async sendWelcome(email: string, name: string, confirmToken?: string): Promise<void> {
    const subject = 'Confirme seu email — FreteCheck'
    const confirmUrl = `https://projeto-fretecheck-back.fy3ze8.easypanel.host/api/v1/auth/confirm-email?token=${confirmToken}`

    const body = `
      <h2 style="margin:0 0 8px;color:${DARK_TEXT};font-size:18px;font-weight:bold">Olá, ${name}!</h2>
      <p style="color:${GRAY};margin:0 0 20px;font-size:14px;line-height:1.6">
        Sua conta foi criada com sucesso. Para ativá-la, confirme seu email clicando no botão abaixo.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
      <tr><td align="center">
        <a href="${confirmUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:6px">
          Confirmar meu email
        </a>
      </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr>
          <td style="background:${LIGHT_BG};border-radius:6px;padding:14px 18px;border-left:3px solid ${ACCENT}">
            <p style="margin:0 0 4px;color:${BRAND};font-size:13px;font-weight:bold">Como funciona</p>
            <p style="margin:0;color:${GRAY};font-size:13px;line-height:1.5">
              1. Faça o <strong>check-in</strong> ao chegar no terminal<br>
              2. Registre o <strong>apontamento</strong> com o responsável<br>
              3. Faça o <strong>check-out</strong> ao sair<br>
              4. O <strong>certificado</strong> é gerado automaticamente
            </p>
          </td>
        </tr>
      </table>

      <p style="color:${GRAY};font-size:12px;margin:0;line-height:1.5">
        Este link expira em 1 hora. Se você não criou esta conta, ignore este email.
      </p>
    `
    await this.sendTransactional(email, subject, this.wrap(body))
  }

  // ─── Certificado emitido ─────────────────────────────────────────────────────

  async sendCertificateIssued(
    email: string,
    data: {
      nome: string
      numero: string
      placa: string
      tempoEsperaMin: number
      tempoExcedenteMin: number
      valorEstimado: string
      pdfUrl: string
    },
  ): Promise<void> {
    const subject = `Certificado ${data.numero} emitido — FreteCheck`
    const body = `
      <h2 style="margin:0 0 8px;color:${DARK_TEXT};font-size:18px;font-weight:bold">Certificado emitido!</h2>
      <p style="color:${GRAY};margin:0 0 20px;font-size:14px;line-height:1.5">
        Olá, ${data.nome}. Seu certificado de tempo de espera foi emitido com sucesso.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr><td style="background:${LIGHT_BG};border-radius:6px 6px 0 0;padding:10px 18px">
          <span style="color:${BRAND};font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em">DADOS DO CERTIFICADO</span>
        </td></tr>
        <tr><td style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;padding:16px 18px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;color:${GRAY};font-size:13px" width="45%">Número</td>
              <td style="padding:4px 0;color:${DARK_TEXT};font-size:13px;font-weight:bold">${data.numero}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:${GRAY};font-size:13px">Placa</td>
              <td style="padding:4px 0;color:${DARK_TEXT};font-size:13px;font-weight:bold">${data.placa}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:${GRAY};font-size:13px">Tempo de espera</td>
              <td style="padding:4px 0;color:${DARK_TEXT};font-size:13px;font-weight:bold">${data.tempoEsperaMin} min</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:${GRAY};font-size:13px">Tempo excedente</td>
              <td style="padding:4px 0;color:${DARK_TEXT};font-size:13px;font-weight:bold">${data.tempoExcedenteMin} min</td>
            </tr>
            <tr>
              <td style="padding:4px 0;color:${GRAY};font-size:13px">Valor estimado</td>
              <td style="padding:4px 0;color:${BRAND};font-size:14px;font-weight:bold">R$ ${data.valorEstimado}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${data.pdfUrl}" style="display:inline-block;background:${BRAND};color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 32px;border-radius:6px">
          Baixar Certificado (PDF)
        </a>
      </td></tr>
      </table>

      <p style="color:${GRAY};font-size:12px;margin:20px 0 0;line-height:1.5;text-align:center">
        Este certificado possui validade jurídica nos termos da Lei 11.442/2007.
      </p>
    `
    await this.sendTransactional(email, subject, this.wrap(body))
  }
}

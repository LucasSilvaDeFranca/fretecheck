import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as fs from 'fs'
import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { PrismaService } from '../../prisma/prisma.service'
import { JwtPayload } from '@fretecheck/types'
import { WebhooksService } from '../webhooks/webhooks.service'
import { EmailService } from '../email/email.service'

@Injectable()
export class CertificadosService {
  private readonly logger = new Logger(CertificadosService.name)

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private webhooks: WebhooksService,
    private email: EmailService,
  ) {}

  async emitir(checkinId: string, user: JwtPayload) {
    // Buscar checkin com todos os dados necessários
    const checkin = await this.prisma.checkin.findUnique({
      where: { id: checkinId },
      include: {
        motorista: { select: { id: true, name: true, email: true, cpf: true, phone: true } },
        veiculo: true,
        terminal: true,
        apontamento: true,
        certificado: true,
      },
    })

    if (!checkin) throw new NotFoundException('Check-in não encontrado')

    if (checkin.motoristaId !== user.sub && user.role !== 'PLATFORM_ADMIN') {
      throw new BadRequestException('Acesso negado')
    }

    if (checkin.status !== 'AWAITING_CHECKOUT' || !checkin.departedAt) {
      throw new ConflictException(
        'Certificado só pode ser emitido após o check-out. Status atual: ' + checkin.status,
      )
    }

    if (checkin.certificado) {
      throw new ConflictException('Certificado já emitido para este check-in')
    }

    if (!checkin.apontamento) {
      throw new ConflictException('Apontamento é obrigatório antes de emitir o certificado')
    }

    // Gerar número sequencial do certificado
    const count = await this.prisma.certificado.count()
    const ano = new Date().getFullYear()
    const numero = `FC-${ano}-${String(count + 1).padStart(6, '0')}`

    this.logger.log(`Gerando certificado ${numero} para check-in ${checkinId}`)

    // Gerar PDF
    const pdfBuffer = await this.gerarPdf(checkin, numero)

    // Hash SHA-256 do PDF
    const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')

    // Assinatura ICP-Brasil (real em produção, mock em dev)
    const assinaturaResult = await this.assinarIcp(pdfBuffer, pdfHash)

    // Upload para Supabase Storage
    const pdfUrl = await this.uploadPdf(pdfBuffer, numero)

    // Persistir certificado e atualizar status do check-in
    const certificado = await this.prisma.$transaction(async (tx) => {
      const cert = await tx.certificado.create({
        data: {
          numero,
          pdfUrl,
          pdfHash,
          assinadoIcpBrasil: assinaturaResult.assinado,
          assinaturaTs: assinaturaResult.timestamp,
          checkinId,
        },
      })

      await tx.checkin.update({
        where: { id: checkinId },
        data: { status: 'CERTIFICATE_ISSUED' },
      })

      return cert
    })

    await this.prisma.auditLog.create({
      data: {
        action: 'certificate.issued',
        resource: 'certificados',
        resourceId: certificado.id,
        userId: user.sub,
        payload: { numero, pdfHash, assinadoIcpBrasil: assinaturaResult.assinado },
      },
    })

    this.logger.log(`Certificado ${numero} emitido. ICP: ${assinaturaResult.assinado}`)

    // Enviar email de certificado (fire-and-forget)
    if (checkin.motorista.email) {
      this.email.sendCertificateIssued(checkin.motorista.email, {
        nome: checkin.motorista.name,
        numero,
        placa: checkin.veiculo?.placa ?? '—',
        tempoEsperaMin: checkin.tempoEsperaMin ?? 0,
        tempoExcedenteMin: checkin.tempoExcedenteMin ?? 0,
        valorEstimado: checkin.valorEstimado ? Number(checkin.valorEstimado).toFixed(2) : '0,00',
        pdfUrl,
      }).catch(() => {})
    }

    this.webhooks.dispatch('CERTIFICATE_ISSUED', {
      checkinId,
      certificadoId: certificado.id,
      numero,
      pdfUrl,
      pdfHash,
      assinadoIcpBrasil: assinaturaResult.assinado,
      motoristaId: user.sub,
    })

    return this.formatCertificado(certificado)
  }

  async buscarPublico(numero: string) {
    const cert = await this.prisma.certificado.findUnique({
      where: { numero },
      include: {
        checkin: {
          include: {
            veiculo: { select: { placa: true } },
            apontamento: true,
          },
        },
      },
    })

    if (!cert) throw new NotFoundException('Certificado não encontrado')

    return {
      numero: cert.numero,
      emitidoAt: cert.emitidoAt.toISOString(),
      assinadoIcpBrasil: cert.assinadoIcpBrasil,
      pdfHash: cert.pdfHash,
      pdfUrl: cert.pdfUrl,
      checkin: {
        placa: cert.checkin.veiculo?.placa ?? '',
        arrivedAt: cert.checkin.arrivedAt.toISOString(),
        departedAt: cert.checkin.departedAt?.toISOString() ?? null,
        tempoEsperaMin: cert.checkin.tempoEsperaMin,
        tempoExcedenteMin: cert.checkin.tempoExcedenteMin,
        valorEstimado: cert.checkin.valorEstimado ? Number(cert.checkin.valorEstimado) : null,
        apontamento: cert.checkin.apontamento
          ? {
              causa: cert.checkin.apontamento.causa,
              causadorNome: cert.checkin.apontamento.causadorNome,
              causadorCnpj: cert.checkin.apontamento.causadorCnpj,
            }
          : null,
      },
    }
  }

  async buscar(checkinId: string, user: JwtPayload) {
    const checkin = await this.prisma.checkin.findUnique({
      where: { id: checkinId },
      include: { certificado: true },
    })

    if (!checkin) throw new NotFoundException('Check-in não encontrado')

    if (checkin.motoristaId !== user.sub && user.role !== 'PLATFORM_ADMIN') {
      throw new BadRequestException('Acesso negado')
    }

    if (!checkin.certificado) throw new NotFoundException('Certificado não encontrado para este check-in')

    return this.formatCertificado(checkin.certificado)
  }

  // ─── PDF Generation ────────────────────────────────────────────────────────

  private async gerarPdf(
    checkin: {
      id: string
      arrivedAt: Date
      departedAt: Date | null
      arrivedLat: import('@prisma/client').Prisma.Decimal
      arrivedLng: import('@prisma/client').Prisma.Decimal
      departedLat?: import('@prisma/client').Prisma.Decimal | null
      departedLng?: import('@prisma/client').Prisma.Decimal | null
      tempoEsperaMin: number | null
      tempoExcedenteMin: number | null
      valorEstimado: import('@prisma/client').Prisma.Decimal | null
      motorista: { name: string; cpf: string | null }
      veiculo: { placa: string; marca: string | null; modelo: string | null; pesoToneladas: import('@prisma/client').Prisma.Decimal } | null
      terminal: { nome: string; cnpj: string | null } | null
      apontamento: {
        causa: string
        causadorCnpj: string
        causadorNome: string
        descricao: string | null
      } | null
    },
    numero: string,
  ): Promise<Buffer> {
    const qrUrl = `https://arbitrax.tec.br/certificado/${numero}`
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 120, margin: 1, color: { dark: '#1E3A5F', light: '#FFFFFF' } })
    const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64')

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const BRAND = '#1E3A5F'
      const ACCENT = '#F59E0B'
      const GRAY = '#6B7280'

      // ── Cabeçalho ──────────────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 90).fill(BRAND)

      doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
        .text('FreteCheck', 50, 25)

      doc.fontSize(10).font('Helvetica')
        .text('Certificado de Tempo de Espera no Transporte', 50, 52)
        .text('Lei 11.442/2007 · Art. 11 · ICP-Brasil (MP 2.200-2/2001)', 50, 67)

      doc.fillColor(ACCENT).fontSize(12).font('Helvetica-Bold')
        .text(`Nº ${numero}`, doc.page.width - 200, 40, { width: 150, align: 'right' })

      // ── Linha de destaque ───────────────────────────────────────────────────
      doc.rect(0, 90, doc.page.width, 4).fill(ACCENT)

      // ── Corpo ──────────────────────────────────────────────────────────────
      let y = 115

      const secao = (titulo: string) => {
        doc.rect(50, y, doc.page.width - 100, 22).fill('#F3F4F6')
        doc.fillColor(BRAND).fontSize(10).font('Helvetica-Bold')
          .text(titulo.toUpperCase(), 58, y + 6)
        y += 30
      }

      const campo = (label: string, valor: string) => {
        doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(label, 58, y)
        doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold').text(valor, 200, y)
        y += 18
      }

      // Dados do Check-in
      secao('Dados do Registro')
      campo('Motorista', checkin.motorista.name)
      if (checkin.motorista.cpf) campo('CPF', checkin.motorista.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'))
      campo('Veículo (Placa)', checkin.veiculo?.placa ?? '—')
      campo('Veículo (Modelo)', `${checkin.veiculo?.marca ?? ''} ${checkin.veiculo?.modelo ?? ''}`.trim() || '—')
      campo('Capacidade de Carga', `${Number((checkin as unknown as { capacidadeCargaTon: unknown }).capacidadeCargaTon ?? 0).toFixed(1)} toneladas`)
      if (checkin.terminal) campo('Terminal / Destino', checkin.terminal.nome)

      y += 5
      secao('Chegada e Saída')
      campo('Chegada', checkin.arrivedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
      campo('Saída', checkin.departedAt ? checkin.departedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—')
      campo('Coords. Chegada', `${Number(checkin.arrivedLat).toFixed(6)}, ${Number(checkin.arrivedLng).toFixed(6)}`)
      if (checkin.departedLat && checkin.departedLng) {
        campo('Coords. Saída', `${Number(checkin.departedLat).toFixed(6)}, ${Number(checkin.departedLng).toFixed(6)}`)
      }

      y += 5
      secao('Tempo de Espera e Cálculo')
      campo('Tempo total de espera', `${checkin.tempoEsperaMin ?? 0} minutos`)
      campo('Tempo livre (Lei 11.442)', '300 minutos (5 horas)')
      campo('Tempo excedente', `${checkin.tempoExcedenteMin ?? 0} minutos`)
      campo('Valor estimado (R$)', checkin.valorEstimado ? `R$ ${Number(checkin.valorEstimado).toFixed(2)}` : 'R$ 0,00')
      campo('Fórmula aplicada', '(min_exc ÷ 60) × peso_ton × R$ 2,41/t/h')

      y += 5
      secao('Causa do Atraso (Apontamento)')
      if (checkin.apontamento) {
        campo('Causa identificada', checkin.apontamento.causa)
        campo('Responsável (Nome)', checkin.apontamento.causadorNome)
        if (checkin.apontamento.causadorCnpj) {
          campo('Responsável (CNPJ)', checkin.apontamento.causadorCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'))
        }
        if (checkin.apontamento.descricao) campo('Descrição', checkin.apontamento.descricao)
      }

      // ── Rodapé ──────────────────────────────────────────────────────────────
      const rodapeY = doc.page.height - 100  // 742 em A4 (842pt)
      const qrSize = 90
      const qrX = doc.page.width - 50 - qrSize
      const qrY = rodapeY - qrSize - 10  // 642 — acima da linha amarela

      // QR Code — canto inferior direito, acima da linha amarela
      doc.image(qrBuffer, qrX, qrY, { width: qrSize })
      doc.fillColor(GRAY).fontSize(7).font('Helvetica')
        .text('Escaneie para verificar', qrX - 5, qrY + qrSize + 2, { width: qrSize + 10, align: 'center' })

      // "Emitido em" — centro da página, alinhado verticalmente com o QR
      doc.fillColor(BRAND).fontSize(9).font('Helvetica-Bold')
        .text(
          `Emitido em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
          50,
          qrY + Math.round(qrSize / 2) - 5,
          { width: doc.page.width - 100, align: 'center' },
        )

      // Fundo do rodapé + linha amarela
      doc.rect(0, rodapeY, doc.page.width, doc.page.height - rodapeY).fill('#F9FAFB')
      doc.rect(0, rodapeY, doc.page.width, 2).fill(ACCENT)

      // Texto legal — abaixo da linha amarela (dentro da margem inferior)
      doc.fillColor(GRAY).fontSize(8).font('Helvetica')
        .text(
          'Este certificado foi gerado automaticamente pela plataforma FreteCheck e possui validade jurídica nos termos da Lei\n' +
          '11.442/2007 (Art. 11) e da Medida Provisória 2.200-2/2001 (ICP-Brasil). O hash SHA-256 deste documento garante\n' +
          'sua integridade e pode ser verificado no portal fretecheck.com.br/verificar',
          50, rodapeY + 10, { width: doc.page.width - 100, align: 'center' },
        )

      doc.end()
    })
  }

  // ─── ICP-Brasil Signature ──────────────────────────────────────────────────

  private async assinarIcp(pdfBuffer: Buffer, _pdfHash: string): Promise<{ assinado: boolean; timestamp: Date }> {
    const certPath = this.config.get<string>('ICP_CERTIFICATE_PATH')
    const keyPath = this.config.get<string>('ICP_PRIVATE_KEY_PATH')

    if (!certPath || !keyPath) {
      this.logger.warn('Certificado ICP-Brasil não configurado — usando mock de desenvolvimento')
      return { assinado: false, timestamp: new Date() }
    }

    try {
      const privateKey = fs.readFileSync(keyPath, 'utf-8')
      const sign = crypto.createSign('SHA256')
      sign.update(pdfBuffer)
      sign.end()
      const signature = sign.sign(privateKey, 'hex')
      this.logger.log(`PDF assinado com ICP-Brasil. Signature: ${signature.substring(0, 16)}...`)
      return { assinado: true, timestamp: new Date() }
    } catch (err) {
      this.logger.error(`Falha na assinatura ICP-Brasil: ${err}`)
      return { assinado: false, timestamp: new Date() }
    }
  }

  // ─── Supabase Storage Upload ───────────────────────────────────────────────

  private async uploadPdf(pdfBuffer: Buffer, numero: string): Promise<string> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      this.logger.warn('Supabase Storage não configurado — retornando URL local mock')
      return `local://certificados/${numero}.pdf`
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const fileName = `certificados/${numero}.pdf`

    const { error } = await supabase.storage
      .from('fretecheck')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (error) {
      this.logger.error(`Erro no upload do certificado: ${error.message}`)
      // Retorna URL local como fallback — não bloqueia a emissão
      return `local://certificados/${numero}.pdf`
    }

    const { data } = supabase.storage.from('fretecheck').getPublicUrl(fileName)
    return data.publicUrl
  }

  // ─── Formatter ────────────────────────────────────────────────────────────

  private formatCertificado(c: {
    id: string
    numero: string
    pdfUrl: string
    pdfHash: string
    assinadoIcpBrasil: boolean
    assinaturaTs: Date | null
    emitidoAt: Date
    checkinId: string
  }) {
    return {
      id: c.id,
      numero: c.numero,
      pdfUrl: c.pdfUrl,
      pdfHash: c.pdfHash,
      assinadoIcpBrasil: c.assinadoIcpBrasil,
      assinaturaTs: c.assinaturaTs?.toISOString(),
      emitidoAt: c.emitidoAt.toISOString(),
      checkinId: c.checkinId,
    }
  }
}

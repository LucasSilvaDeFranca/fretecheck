import { z } from 'zod'
import { isValidCpf, isValidCnpj, isValidPlaca, isValidPhone } from './cpf-cnpj'
import { CausaType, Role } from '@fretecheck/types'

// ── Campos reutilizáveis ───────────────────────

export const cpfSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine(isValidCpf, { message: 'CPF inválido' })

export const cnpjSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .refine(isValidCnpj, { message: 'CNPJ inválido' })

export const placaSchema = z
  .string()
  .transform((v) => v.replace(/[-\s]/g, '').toUpperCase())
  .refine(isValidPlaca, { message: 'Placa inválida (use formato ABC1234 ou ABC1D23)' })

export const phoneSchema = z
  .string()
  .refine(isValidPhone, { message: 'Telefone inválido (use E.164: +5511999999999)' })

export const geolocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().max(500, 'Precisão GPS deve ser ≤ 500 metros'),
})

// ── Auth ───────────────────────────────────────

export const registerSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    cpf: cpfSchema.optional(),
    password: z.string().min(8).optional(),
    role: z.nativeEnum(Role).optional(),
    empresaId: z.string().cuid().optional(),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Informe email ou telefone',
    path: ['email'],
  })

export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    password: z.string().optional(),
  })
  .refine((d) => d.email || d.phone, {
    message: 'Informe email ou telefone',
    path: ['email'],
  })

export const whatsappVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, 'OTP deve ter 6 dígitos').regex(/^\d{6}$/),
})

// ── Check-in ───────────────────────────────────

export const createCheckinSchema = z.object({
  placa: placaSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().max(500, 'Precisão GPS deve ser ≤ 500 metros'),
  photoUrl: z.string().url().optional(),
  cteNumero: z.string().optional(),
  cteChave: z
    .string()
    .length(44, 'Chave CT-e deve ter 44 dígitos')
    .regex(/^\d{44}$/)
    .optional(),
  observacoes: z.string().max(500).optional(),
  terminalId: z.string().cuid().optional(),
})

export const createApontamentoSchema = z.object({
  causa: z.nativeEnum(CausaType),
  causadorCnpj: cnpjSchema,
  causadorNome: z.string().min(2).max(150),
  descricao: z.string().max(1000).optional(),
  evidenciaUrls: z.array(z.string().url()).max(10).optional(),
})

export const checkoutSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().max(500, 'Precisão GPS deve ser ≤ 500 metros'),
})

// ── Título ─────────────────────────────────────

export const createTituloSchema = z.object({
  checkinIds: z.array(z.string().cuid()).min(1).max(50),
  vencimento: z.string().datetime({ message: 'Data de vencimento inválida' }),
})

export const contestarTituloSchema = z.object({
  motivo: z.string().min(20).max(2000),
  evidenciaUrls: z.array(z.string().url()).max(10).optional(),
})

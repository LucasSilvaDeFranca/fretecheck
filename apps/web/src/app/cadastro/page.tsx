'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { Button, Input, Card } from '@/components/ui'
import type { LoginResponse } from '@fretecheck/types'

const schema = z.object({
  name: z.string().min(3, 'Nome muito curto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  phone: z
    .string()
    .regex(/^\+55[1-9][0-9]{9,10}$/, 'Formato: +5511999999999')
    .optional()
    .or(z.literal('')),
  cpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'CPF inválido')
    .optional()
    .or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function CadastroPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError(null)
    try {
      const payload = { ...data, role: 'MOTORISTA', phone: data.phone || undefined, cpf: data.cpf || undefined }
      const { data: res } = await api.post<LoginResponse>('/auth/register', payload)
      setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken)
      router.push('/motorista')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Erro ao cadastrar. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1 cursor-pointer">
            <span className="text-white font-bold text-3xl">Frete</span>
            <span className="text-brand-500 font-bold text-3xl">Check</span>
          </Link>
          <p className="text-text-muted mt-2 text-sm">Crie sua conta gratuitamente</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nome completo" {...register('name')} error={errors.name?.message} placeholder="João da Silva" />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} placeholder="joao@transportadora.com" />
            <Input label="Senha" type="password" {...register('password')} error={errors.password?.message} placeholder="Mínimo 8 caracteres" />
            <Input label="WhatsApp (opcional)" {...register('phone')} error={errors.phone?.message} placeholder="+5511999999999" hint="Para login via WhatsApp e notificações" />
            <Input label="CPF (opcional)" {...register('cpf')} error={errors.cpf?.message} placeholder="000.000.000-00" />

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3 text-red-400 text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Criar conta
            </Button>
          </form>
        </Card>

        <p className="text-center text-text-muted text-sm mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-brand-500 hover:text-brand-400 transition-colors cursor-pointer">Entrar</Link>
        </p>
      </div>
    </div>
  )
}

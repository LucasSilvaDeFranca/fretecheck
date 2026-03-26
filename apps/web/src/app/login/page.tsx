'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuthStore } from '@/lib/auth-store'
import type { LoginResponse } from '@fretecheck/types'

const loginSchema = z.object({
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^\+55[1-9][0-9]{9,10}$/, 'Use o formato +5511999999999')
    .optional()
    .or(z.literal('')),
  password: z.string().min(8, 'Mínimo 8 caracteres').optional().or(z.literal('')),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (searchParams.get('confirmed') === 'true') {
      setConfirmed(true)
    }
  }, [searchParams])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const { data: res } = await api.post<LoginResponse>('/auth/login', data)
      setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken)

      if (res.user.role === 'MOTORISTA') router.push('/motorista')
      else if (res.user.role.startsWith('TRANSPORTADORA')) router.push('/transportadora')
      else if (res.user.role === 'EMBARCADOR') router.push('/embarcador')
      else router.push('/admin')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1 cursor-pointer">
            <span className="text-text-primary font-bold text-3xl">Frete</span>
            <span className="text-brand-500 font-bold text-3xl">Check</span>
          </Link>
          <p className="text-text-muted mt-2 text-sm">Entre na sua conta</p>
        </div>

        {confirmed && (
          <div className="always-dark bg-teal-400/10 border border-teal-400/25 rounded-xl p-4 mb-4 text-center">
            <p className="text-teal-400 text-sm font-medium">Email confirmado com sucesso! Agora faça login.</p>
          </div>
        )}

        <div className="always-dark bg-dark-800 border border-dark-600 rounded-xl p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Email ou telefone
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="joao@transportadora.com"
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Senha</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="input-field"
              />
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center">
              <p className="text-text-muted text-sm">
                Prefere entrar sem senha? Use{' '}
                <Link href="/login/otp" className="text-brand-500 hover:text-brand-400 transition-colors cursor-pointer">
                  código por email
                </Link>
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-text-muted text-sm mt-4">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-brand-500 hover:text-brand-400 transition-colors cursor-pointer">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  )
}

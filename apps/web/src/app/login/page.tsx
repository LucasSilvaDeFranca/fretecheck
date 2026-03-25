'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
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
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const { data: res } = await api.post<LoginResponse>('/auth/login', data)
      setAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken)

      // Redirecionar por role
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1">
            <span className="text-brand-700 font-bold text-3xl">Frete</span>
            <span className="text-brand-500 font-bold text-3xl">Check</span>
          </Link>
          <p className="text-gray-500 mt-2 text-sm">Entre na sua conta</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email ou telefone
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="joao@transportadora.com"
                className="input-field"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Mínimo 8 caracteres"
                className="input-field"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center">
              <p className="text-gray-500 text-sm">
                Prefere entrar sem senha? Use{' '}
                <Link href="/login/otp" className="text-brand-600 hover:underline">
                  código por email
                </Link>
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-brand-600 hover:underline">
            Cadastre-se grátis
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { Button, Input, Card } from '@/components/ui'
import type { LoginResponse } from '@fretecheck/types'

type Step = 'email' | 'otp'

export default function OtpLoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendOtp = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Email inválido')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/otp/send', { email })
      setStep('otp')
    } catch {
      setError('Email não cadastrado. Faça o cadastro primeiro.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<LoginResponse>('/auth/otp/verify', { email, code: otp })
      setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken)
      router.push('/motorista')
    } catch {
      setError('Código inválido ou expirado.')
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
          <p className="text-gray-500 mt-2 text-sm">Login sem senha</p>
        </div>

        <Card>
          {step === 'email' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <svg className="h-6 w-6 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-blue-800">Enviaremos um código de 6 dígitos para o seu email.</p>
              </div>

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joao@transportadora.com"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button className="w-full" size="lg" onClick={sendOtp} loading={loading}>
                Enviar código
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Código enviado para <strong>{email}</strong>.
                <button onClick={() => setStep('email')} className="ml-2 text-brand-600 hover:underline text-xs">
                  Alterar email
                </button>
              </p>

              <Input
                label="Código de verificação"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em] font-mono"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button className="w-full" size="lg" onClick={verifyOtp} loading={loading} disabled={otp.length !== 6}>
                Verificar código
              </Button>
            </div>
          )}
        </Card>

        <p className="text-center text-gray-500 text-sm mt-4">
          Prefere senha?{' '}
          <Link href="/login" className="text-brand-600 hover:underline">Login com email e senha</Link>
        </p>
      </div>
    </div>
  )
}

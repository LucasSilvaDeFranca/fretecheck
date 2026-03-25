'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { Button, Input, Card } from '@/components/ui'
import type { LoginResponse } from '@fretecheck/types'

type Step = 'phone' | 'otp'

export default function WhatsAppLoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendOtp = async () => {
    if (!phone.match(/^\+55[1-9][0-9]{9,10}$/)) {
      setError('Formato inválido. Use +5511999999999')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/whatsapp/send-otp', { phone })
      setStep('otp')
    } catch {
      setError('Telefone não cadastrado. Faça o cadastro primeiro.')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post<LoginResponse>('/auth/whatsapp/verify', { phone, code: otp })
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
          <p className="text-gray-500 mt-2 text-sm">Login via WhatsApp</p>
        </div>

        <Card>
          {step === 'phone' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <svg className="h-8 w-8 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.122 1.524 5.862L.057 23.868l6.177-1.44A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.846 0-3.585-.5-5.083-1.373l-.362-.214-3.664.854.875-3.55-.235-.375C2.44 15.729 2 13.922 2 12 2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
                <p className="text-sm text-green-800">Enviaremos um código de 6 dígitos para o seu WhatsApp.</p>
              </div>

              <Input
                label="Número do WhatsApp"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+5511999999999"
                hint="Com código do país e DDD"
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button className="w-full" size="lg" onClick={sendOtp} loading={loading}>
                Enviar código
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Código enviado para <strong>{phone}</strong>.
                <button onClick={() => setStep('phone')} className="ml-2 text-brand-600 hover:underline text-xs">
                  Alterar número
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
          <Link href="/login" className="text-brand-600 hover:underline">Login com email</Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface CertificateQrProps {
  numero: string
  size?: number
}

export function CertificateQr({ numero, size = 128 }: CertificateQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, `https://arbitrax.tec.br/certificado/${numero}`, {
      width: size,
      margin: 1,
      color: { dark: '#1E3A5F', light: '#FFFFFF' },
    })
  }, [numero, size])

  return <canvas ref={canvasRef} className="rounded" />
}

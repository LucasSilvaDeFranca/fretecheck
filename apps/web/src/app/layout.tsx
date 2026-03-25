import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'FreteCheck — Certificação de Tempo de Espera',
  description:
    'Identifique o responsável. Certifique a espera. Cobre de quem deve.',
  keywords: ['frete', 'transporte', 'certificação', 'espera', 'cobrança'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

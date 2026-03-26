import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'FreteCheck — Certificação de Tempo de Espera',
  description:
    'Identifique o responsável. Certifique a espera. Cobre de quem deve.',
  keywords: ['frete', 'transporte', 'certificação', 'espera', 'cobrança'],
}

// Script to prevent flash of wrong theme on initial load
const themeScript = `
  (function() {
    var theme = localStorage.getItem('fretecheck-theme') || 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  })();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

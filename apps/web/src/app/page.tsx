'use client'

import Link from 'next/link'
import { useState } from 'react'
import { clsx } from 'clsx'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="min-h-screen bg-dark-900 text-text-secondary overflow-x-hidden">
      {/* Navbar */}
      <nav className="w-full flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 border-b border-dark-600 bg-dark-900/80 backdrop-blur-md relative z-50">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-2xl font-bold text-text-primary">Frete</span>
          <span className="text-2xl font-bold text-brand-500">Check</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-text-muted">
          <Link href="#como-funciona" className="hover:text-text-primary transition-colors duration-150 cursor-pointer">Como funciona</Link>
          <Link href="#pilares" className="hover:text-text-primary transition-colors duration-150 cursor-pointer">Pilares</Link>
          <Link href="/login" className="hover:text-text-primary transition-colors duration-150 cursor-pointer">Entrar</Link>
          <Link href="/cadastro" className="bg-brand-500 text-white rounded-lg py-2.5 px-5 font-semibold hover:bg-brand-600 transition-all duration-150 hover:shadow-[0_0_24px_rgba(240,90,26,0.3)] cursor-pointer">
            Começar grátis
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-text-primary p-2 cursor-pointer" aria-label="Menu">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-dark-800 border-b border-dark-600 px-6 py-4 flex flex-col gap-3">
          <Link href="#como-funciona" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-text-primary text-sm py-2 cursor-pointer">Como funciona</Link>
          <Link href="/login" onClick={() => setMenuOpen(false)} className="text-text-muted hover:text-text-primary text-sm py-2 cursor-pointer">Entrar</Link>
          <Link href="/cadastro" onClick={() => setMenuOpen(false)} className="bg-brand-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg text-center cursor-pointer">Começar grátis</Link>
        </div>
      )}

      {/* Hero */}
      <section className="px-6 md:px-12 lg:px-20 pt-16 md:pt-24 pb-20 max-w-[82rem] mx-auto">
        <div className="inline-flex items-center gap-2 section-label mb-8">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          Beta disponível para transportadoras
        </div>

        <h1 className="font-bold text-4xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tight text-text-primary mb-6">
          Identifique o responsável.
          <br />
          <span className="text-brand-500">Certifique a espera.</span>
          <br />
          Cobre de quem deve.
        </h1>

        <p className="text-lg md:text-xl text-text-muted max-w-2xl leading-relaxed mb-10">
          Transportadoras e motoristas perdem R$ 5 bilhões/ano em tempo de espera sem prova
          técnica. FreteCheck registra, certifica e automatiza a cobrança com validade jurídica.
        </p>

        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/cadastro" className="bg-brand-500 text-white font-semibold px-8 py-3 text-base rounded-lg hover:bg-brand-600 transition-all duration-150 hover:shadow-[0_0_32px_rgba(240,90,26,0.35)] cursor-pointer">
            Começar grátis
          </Link>
          <Link href="#como-funciona" className="px-8 py-3 text-base text-brand-500 border-2 border-brand-500 rounded-lg hover:bg-brand-500 hover:text-text-primary transition-all duration-150 cursor-pointer font-semibold">
            Saiba mais
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 md:px-12 lg:px-20 py-20 max-w-[82rem] mx-auto">
        <div className="flex items-center gap-4 mb-14">
          <span className="section-label">Números</span>
          <div className="h-px bg-dark-600 flex-grow" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8">
          {[
            { value: 'R$ 5B', label: 'perdidos/ano', unit: 'Prejuízo' },
            { value: 'Lei 11.442', label: 'validade legal', unit: 'Base' },
            { value: '5h', label: 'tolerância grátis', unit: 'Limite' },
            { value: 'R$ 1,38', label: 'por ton/hora', unit: 'Valor' },
          ].map((m) => (
            <div key={m.label} className="border-l border-dark-600 pl-6">
              <div className="flex items-start gap-2">
                <span className="text-3xl md:text-5xl font-bold tracking-tight text-brand-500 leading-none">{m.value}</span>
                <span className="font-mono text-xs text-text-muted mt-2">({m.unit})</span>
              </div>
              <span className="text-sm text-text-secondary mt-3 block">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pilares */}
      <section id="pilares" className="px-6 md:px-12 lg:px-20 py-20 max-w-[82rem] mx-auto">
        <div className="flex items-center gap-4 mb-16">
          <span className="section-label">Pilares</span>
          <div className="h-px bg-dark-600 flex-grow" />
        </div>

        <div className="flex flex-col">
          {[
            {
              num: '01',
              title: 'Certificar',
              tags: ['GPS', 'Timestamp', 'ICP-Brasil'],
              desc: 'Registro imutável com timestamp, GPS e identificação do causador. Validade jurídica pela ICP-Brasil e MP 2.200-2/2001.',
            },
            {
              num: '02',
              title: 'Cobrar',
              tags: ['Lei 11.442', 'Automático', 'Títulos'],
              desc: 'Geração automática de títulos de cobrança contra o responsável real. Cálculo baseado na Lei 11.442/2007, Art. 11.',
            },
            {
              num: '03',
              title: 'Mapear',
              tags: ['Score', 'Heatmap', 'Alertas'],
              desc: 'Score público de terminais, heatmaps de atraso e alertas de overbooking em tempo real para toda a cadeia logística.',
            },
          ].map((p, i) => (
            <div
              key={p.num}
              className={clsx(
                'flex flex-col lg:flex-row lg:items-center gap-6 py-10 group hover:bg-dark-700 transition-colors duration-150 -mx-6 px-6 md:-mx-12 md:px-12 lg:-mx-20 lg:px-20 cursor-pointer',
                i < 2 && 'border-b border-dark-600',
              )}
            >
              <div className="font-mono text-2xl md:text-3xl text-brand-500 w-16 shrink-0">{p.num}.</div>
              <div className="text-3xl md:text-4xl font-semibold text-text-primary w-full lg:w-1/3 tracking-tight">{p.title}</div>
              <div className="flex-grow flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span key={t} className="border border-text-muted/20 bg-text-muted/10 rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-text-muted">
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-text-muted text-sm md:text-base max-w-lg leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="px-6 md:px-12 lg:px-20 py-24 max-w-[82rem] mx-auto">
        <div className="flex items-center gap-4 mb-16">
          <span className="section-label">Como funciona</span>
          <div className="h-px bg-dark-600 flex-grow" />
        </div>

        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-text-primary leading-[1.2] max-w-5xl mb-16">
          Em 4 passos simples, o motorista registra, comprova e gera o certificado com validade jurídica.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { step: '01', title: 'Check-in', desc: 'Motorista chega ao terminal e registra entrada com GPS, placa e capacidade de carga.' },
            { step: '02', title: 'Apontamento', desc: 'Identifica o causador do atraso (embarcador, destinatário ou terminal) com evidências.' },
            { step: '03', title: 'Check-out', desc: 'Registra saída. Sistema calcula tempo de espera, excedente e valor automaticamente.' },
            { step: '04', title: 'Certificado', desc: 'PDF com assinatura digital, QR code de verificação e hash SHA-256 é gerado e enviado.' },
          ].map((s) => (
            <div key={s.step} className="bg-dark-800 border border-dark-600 rounded-[20px] p-8 hover:border-dark-500 transition-all duration-150 group">
              <span className="font-mono text-brand-500 text-sm mb-4 block">{s.step}.</span>
              <h3 className="text-xl font-semibold text-text-primary mb-3 tracking-tight">{s.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-500 py-16 md:py-20 overflow-hidden">
        <div className="max-w-[82rem] mx-auto px-6 md:px-12 lg:px-20 flex flex-col md:flex-row items-center justify-between gap-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Comece a certificar seus fretes hoje.
          </h2>
          <Link href="/cadastro" className="bg-white text-brand-500 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors duration-150 cursor-pointer whitespace-nowrap">
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-600 pt-16 pb-8 px-6 md:px-12 lg:px-20">
        <div className="max-w-[82rem] mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-text-primary">Frete</span>
                <span className="text-2xl font-bold text-brand-500">Check</span>
              </div>
              <p className="text-sm text-text-muted max-w-xs">Certificação de Tempo de Espera no Transporte com validade jurídica.</p>
            </div>
            <div className="flex gap-12">
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-text-primary">Plataforma</h4>
                <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer">Entrar</Link>
                <Link href="/cadastro" className="text-sm text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer">Cadastrar</Link>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-text-primary">Legal</h4>
                <Link href="/privacidade" className="text-sm text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer">Privacidade (LGPD)</Link>
                <Link href="/termos" className="text-sm text-text-muted hover:text-text-primary transition-colors duration-150 cursor-pointer">Termos de uso</Link>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-dark-600 mb-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-muted">
            <span>&copy; {new Date().getFullYear()} FreteCheck. Todos os direitos reservados.</span>
          </div>
        </div>
      </footer>
    </main>
  )
}


'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="min-h-screen bg-brand-900">
      {/* Header */}
      <header className="px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-2xl">Frete</span>
            <span className="text-accent font-bold text-2xl">Check</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/terminais" className="text-brand-200 hover:text-white text-sm transition-colors duration-150 cursor-pointer">
              Score de Terminais
            </Link>
            <Link href="/login" className="text-brand-200 hover:text-white text-sm transition-colors duration-150 cursor-pointer">
              Entrar
            </Link>
            <Link href="/cadastro" className="bg-cta hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors duration-150 cursor-pointer">
              Começar grátis
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white cursor-pointer p-2"
            aria-label="Menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t border-brand-800 pt-4 flex flex-col gap-3">
            <Link href="/terminais" className="text-brand-200 hover:text-white text-sm py-2 cursor-pointer">
              Score de Terminais
            </Link>
            <Link href="/login" className="text-brand-200 hover:text-white text-sm py-2 cursor-pointer">
              Entrar
            </Link>
            <Link href="/cadastro" className="bg-cta hover:bg-orange-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg text-center transition-colors duration-150 cursor-pointer">
              Começar grátis
            </Link>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="px-6 py-16 md:py-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-800 text-brand-200 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Beta disponível para transportadoras
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
          Identifique o responsável.
          <br />
          <span className="text-accent">Certifique a espera.</span>
          <br />
          Cobre de quem deve.
        </h1>

        <p className="text-lg md:text-xl text-brand-200 mb-10 max-w-2xl mx-auto leading-relaxed">
          Transportadoras e motoristas perdem R$ 5 bilhões/ano em tempo de espera sem prova
          técnica. FreteCheck registra, certifica e automatiza a cobrança com validade jurídica.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/cadastro" className="bg-cta hover:bg-orange-600 text-white font-semibold px-8 py-3 text-base rounded-lg transition-colors duration-150 cursor-pointer">
            Começar grátis
          </Link>
          <Link
            href="/terminais"
            className="px-8 py-3 text-base text-white border border-brand-400 rounded-lg hover:bg-brand-800 transition-colors duration-150 cursor-pointer"
          >
            Ver score de terminais
          </Link>
        </div>
      </section>

      {/* Pilares */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: 'CERTIFICAR',
              desc: 'Registro imutável com timestamp, GPS e identificação do causador. Validade jurídica pela ICP-Brasil.',
            },
            {
              icon: (
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              ),
              title: 'COBRAR',
              desc: 'Geração automática de títulos contra o responsável real. Base legal: Lei 11.442/2007, Art. 11.',
            },
            {
              icon: (
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              ),
              title: 'MAPEAR',
              desc: 'Score público de terminais, heatmaps e alertas de overbooking em tempo real.',
            },
          ].map((p) => (
            <div key={p.title} className="bg-brand-800 rounded-xl p-6 text-center border border-brand-700 hover:border-brand-600 transition-colors duration-150">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-brand-700 text-accent mb-4">
                {p.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{p.title}</h3>
              <p className="text-brand-300 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Métricas */}
      <section className="px-6 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: 'R$ 5B', label: 'perdidos/ano' },
            { value: 'Lei 11.442', label: 'validade legal' },
            { value: '5h', label: 'tolerância grátis' },
            { value: 'R$ 1,38', label: 'por ton/hora' },
          ].map((m) => (
            <div key={m.label}>
              <div className="text-2xl md:text-3xl font-bold text-white">{m.value}</div>
              <div className="text-brand-300 text-sm mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-brand-800 max-w-7xl mx-auto mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-brand-400 text-sm">
          <span>&copy; {new Date().getFullYear()} FreteCheck. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-brand-200 transition-colors duration-150 cursor-pointer">
              Privacidade (LGPD)
            </Link>
            <Link href="/termos" className="hover:text-brand-200 transition-colors duration-150 cursor-pointer">
              Termos de uso
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

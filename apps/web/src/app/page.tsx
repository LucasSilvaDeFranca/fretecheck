import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-700">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-2xl">Frete</span>
          <span className="text-brand-300 font-bold text-2xl">Check</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/terminais" className="text-brand-200 hover:text-white text-sm transition-colors">
            Score de Terminais
          </Link>
          <Link href="/login" className="text-brand-200 hover:text-white text-sm transition-colors">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn-primary text-sm">
            Começar grátis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="px-6 py-24 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-800 text-brand-200 text-sm mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Beta disponível para transportadoras
        </div>

        <h1 className="text-5xl font-bold text-white leading-tight mb-6">
          Identifique o responsável.
          <br />
          <span className="text-brand-300">Certifique a espera.</span>
          <br />
          Cobre de quem deve.
        </h1>

        <p className="text-xl text-brand-200 mb-10 max-w-2xl mx-auto">
          Transportadoras e motoristas perdem R$ 5 bilhões/ano em tempo de espera sem prova
          técnica. FreteCheck registra, certifica e automatiza a cobrança com validade jurídica.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/cadastro" className="btn-primary px-8 py-3 text-base">
            Começar grátis
          </Link>
          <Link
            href="/terminais"
            className="px-8 py-3 text-base text-white border border-brand-400 rounded-lg hover:bg-brand-800 transition-colors"
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
              icon: '📋',
              title: 'CERTIFICAR',
              desc: 'Registro imutável com timestamp, GPS e identificação do causador. Validade jurídica pela ICP-Brasil.',
            },
            {
              icon: '💰',
              title: 'COBRAR',
              desc: 'Geração automática de títulos contra o responsável real. Base legal: Lei 11.442/2007, Art. 11.',
            },
            {
              icon: '📊',
              title: 'MAPEAR',
              desc: 'Score público de terminais, heatmaps e alertas de overbooking em tempo real.',
            },
          ].map((p) => (
            <div key={p.title} className="bg-white/10 backdrop-blur rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">{p.icon}</div>
              <h3 className="text-white font-bold text-xl mb-2">{p.title}</h3>
              <p className="text-brand-200 text-sm">{p.desc}</p>
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
              <div className="text-3xl font-bold text-white">{m.value}</div>
              <div className="text-brand-300 text-sm mt-1">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-brand-800 max-w-7xl mx-auto mt-8">
        <div className="flex items-center justify-between text-brand-400 text-sm">
          <span>© {new Date().getFullYear()} FreteCheck. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <Link href="/privacidade" className="hover:text-brand-200 transition-colors">
              Privacidade (LGPD)
            </Link>
            <Link href="/termos" className="hover:text-brand-200 transition-colors">
              Termos de uso
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

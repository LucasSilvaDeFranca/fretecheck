import Link from 'next/link'

export default function CertificadoNotFound() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1E3A5F] text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold">FreteCheck</h1>
          <p className="text-blue-200 text-sm mt-0.5">Verificação de Certificado</p>
        </div>
        <div className="h-1 bg-amber-400" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Certificado não encontrado</h2>
        <p className="text-gray-500 text-sm mb-6">
          O número informado não corresponde a nenhum certificado emitido pela plataforma FreteCheck.
          Verifique se o número está correto e tente novamente.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#1E3A5F] hover:underline text-sm font-medium"
        >
          Acessar FreteCheck
        </Link>
      </div>
    </div>
  )
}

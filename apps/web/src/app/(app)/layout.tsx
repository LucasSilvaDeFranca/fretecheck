import { Sidebar } from '@/components/layout/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/cadastro', '/login/otp', '/terminais']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic =
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/certificado')

  if (isPublic) return NextResponse.next()

  // Verificar token no cookie (SSR-safe) ou deixar o hook client-side tratar
  const token = request.cookies.get('fretecheck-token')?.value
  if (!token && pathname.startsWith('/motorista') || !token && pathname.startsWith('/transportadora')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}

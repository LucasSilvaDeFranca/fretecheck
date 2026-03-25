'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export function useAuth({ required = true } = {}) {
  const router = useRouter()
  const { user, accessToken, clearAuth, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (required && !isAuthenticated()) {
      router.replace('/login')
    }
  }, [required, isAuthenticated, router])

  return { user, accessToken, clearAuth, isAuthenticated: isAuthenticated() }
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUserResponse } from '@fretecheck/types'

interface AuthState {
  user: AuthUserResponse | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: AuthUserResponse, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('fc_access_token', accessToken)
          localStorage.setItem('fc_refresh_token', refreshToken)
          document.cookie = `fretecheck-token=${accessToken}; path=/; max-age=900; SameSite=Lax`
        }
        set({ user, accessToken, refreshToken })
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fc_access_token')
          localStorage.removeItem('fc_refresh_token')
          document.cookie = 'fretecheck-token=; path=/; max-age=0'
        }
        set({ user: null, accessToken: null, refreshToken: null })
      },

      isAuthenticated: () => !!get().user && !!get().accessToken,
    }),
    {
      name: 'fretecheck-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
)

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  name: string
  email: string
  password: string
  password_confirmation: string
  phone?: string
  shop_name: string
  shop_type: 'tailor' | 'boutique' | 'both'
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('tms_user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(!!localStorage.getItem('tms_token'))

  useEffect(() => {
    if (localStorage.getItem('tms_token')) {
      refreshUser().finally(() => setLoading(false))
    }
  }, [])

  async function refreshUser() {
    const { data } = await api.get('/auth/me')
    setUser(data.user)
    localStorage.setItem('tms_user', JSON.stringify(data.user))
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('tms_token', data.token)
    localStorage.setItem('tms_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  async function register(formData: RegisterData) {
    const { data } = await api.post('/auth/register', formData)
    localStorage.setItem('tms_token', data.token)
    localStorage.setItem('tms_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('tms_token')
      localStorage.removeItem('tms_user')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMe()
  }, [])

  const signUp = async (payload) => {
    const { data } = await api.post('/auth/signup', payload)
    setUser(data.user)
    return data.user
  }

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload)
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { 'Content-Type': 'application/json' } })
    } catch {
      /* Still sign out in UI; cookie clear may have failed over the network. */
    } finally {
      setUser(null)
      navigate('/auth', { replace: true })
    }
  }

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, signUp, login, logout, refreshUser }),
    [user, loading, navigate, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

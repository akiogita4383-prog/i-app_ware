import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete (config.headers as Record<string, unknown>)['Content-Type']
      delete (config.headers as Record<string, unknown>)['content-type']
    }
  } else if (config.headers) {
    config.headers['Content-Type'] = 'application/json'
  }

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ware-auth')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const stored = localStorage.getItem('ware-auth')
        if (stored) {
          const { state } = JSON.parse(stored)
          if (state?.refreshToken) {
            const res = await axios.post('/api/auth/refresh', { refreshToken: state.refreshToken })
            const { accessToken, refreshToken } = res.data.data
            const parsed = JSON.parse(stored)
            parsed.state.accessToken = accessToken
            parsed.state.refreshToken = refreshToken
            localStorage.setItem('ware-auth', JSON.stringify(parsed))
            original.headers.Authorization = `Bearer ${accessToken}`
            return api(original)
          }
        }
      } catch {
        localStorage.removeItem('ware-auth')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

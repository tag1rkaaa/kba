import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth'
import { api } from '../api/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  
  const [isForgotMode, setIsForgotMode] = useState(false)
  
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const data = await authApi.login(email, password)
      localStorage.setItem('access_token', data.access_token)
      navigate('/')
    } catch {
      setError('Неверный email или пароль')
    }
  }

  const requestReset = useMutation({
    mutationFn: (email: string) => 
      api.post('/users/request-password-reset', { email }),
    onSuccess: () => {
      alert('Заявка на сброс пароля отправлена администратору. Ожидайте.')
      setIsForgotMode(false)
      setPassword('')
    },
    onError: () => {
      setError('Ошибка при отправке заявки. Проверьте правильность email.')
    }
  })

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Пожалуйста, введите ваш email')
      return
    }
    requestReset.mutate(email)
  }

  return (
    <div className="min-h-screen flex items-center justify-center font-sans transition-colors duration-200">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-slate-700 w-full max-w-md transition-colors">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">ЦУР Знание</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-6 transition-colors">
          {isForgotMode ? 'Восстановление пароля' : 'Войдите в свой аккаунт'}
        </p>

        {isForgotMode ? (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
            
            {error && <p className="text-red-500 dark:text-red-400 text-sm transition-colors">{error}</p>}
            
            <button
              type="submit"
              disabled={requestReset.isPending}
              className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition font-medium disabled:opacity-50"
            >
              {requestReset.isPending ? 'Отправка...' : 'Запросить новый пароль'}
            </button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false)
                  setError('')
                }}
                className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 hover:underline transition-colors"
              >
                ← Вернуться к входу
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors">Пароль</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true)
                      setError('')
                    }}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline focus:outline-none transition-colors"
                    tabIndex={-1}
                  >
                    Забыли пароль?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {error && <p className="text-red-500 dark:text-red-400 text-sm transition-colors">{error}</p>}
              
              <button
                type="submit"
                className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition font-medium"
              >
                Войти
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-4 transition-colors">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-teal-600 dark:text-teal-400 hover:underline transition-colors">
                Зарегистрироваться
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
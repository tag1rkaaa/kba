import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await authApi.register(email, password)
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Ошибка регистрации')
    }
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center font-sans transition-colors duration-200">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-slate-700 w-full max-w-md text-center transition-colors">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Заявка отправлена</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-6 transition-colors">
          Ваш аккаунт ожидает подтверждения администратора.
          Мы сообщим когда доступ будет открыт.
        </p>
        <Link to="/login" className="text-teal-600 dark:text-teal-400 hover:underline text-sm transition-colors">
          Вернуться на страницу входа
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center font-sans transition-colors duration-200">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-transparent dark:border-slate-700 w-full max-w-md transition-colors">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors">Регистрация</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-6 transition-colors">Создайте аккаунт — администратор подтвердит доступ</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              // Исправлены цвета текста и плейсхолдера
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              // Исправлены цвета текста и плейсхолдера
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              placeholder="Минимум 8 символов"
              minLength={8}
              required
            />
          </div>
          
          {error && <p className="text-red-500 dark:text-red-400 text-sm transition-colors">{error}</p>}
          
          <button
            type="submit"
            className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition font-medium"
          >
            Отправить заявку
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-slate-400 mt-4 transition-colors">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-teal-600 dark:text-teal-400 hover:underline transition-colors">Войти</Link>
        </p>
      </div>
    </div>
  )
}
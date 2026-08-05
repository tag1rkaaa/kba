import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

// 1. ИМПОРТИРУЕМ ХЛЕБНЫЕ КРОШКИ
import Breadcrumbs from '../components/Breadcrumbs'

interface User {
  id: number
  email: string
  role: string
  is_active: boolean
}

// Интерфейс для заявки на сброс
interface ResetRequest {
  id: number
  user_id: number
  email: string
  created_at: string
}

const ROLES = ['viewer', 'editor', 'moderator', 'admin']

export default function AdminPage() {
  const qc = useQueryClient()

  // Состояния для ручного сброса пароля (в списке всех пользователей)
  const [resetId, setResetId] = useState<number | null>(null)
  
  // Состояния для обработки заявок на сброс
  const [requestResetId, setRequestResetId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // 1. Запросы данных
  const { data: pending } = useQuery({
    queryKey: ['users', 'pending'],
    queryFn: () => api.get<User[]>('/users/pending').then(r => r.data),
  })

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users/').then(r => r.data),
  })

  // Запрос списка заявок на сброс пароля
  const { data: resetRequests } = useQuery({
    queryKey: ['users', 'reset-requests'],
    queryFn: () => api.get<ResetRequest[]>('/users/reset-requests').then(r => r.data),
  })

  // 2. Мутации модерации пользователей
  const approve = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })

  const reject = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.patch(`/users/${id}/role`, null, { params: { role } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }) },
  })

  // 3. Мутация для сброса пароля напрямую (для списка всех пользователей)
  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.post(`/users/${id}/reset-password`, { new_password: password }),
    onSuccess: () => {
      setResetId(null)
      setNewPassword('')
      alert('Пароль успешно обновлён')
    },
  })

  // 4. Мутация для обработки заявки (меняет пароль и удаляет заявку)
  const resolveResetRequest = useMutation({
    mutationFn: ({ requestId, userId, password }: { requestId: number, userId: number, password: string }) =>
      api.post(`/users/reset-requests/${requestId}/resolve`, { user_id: userId, new_password: password }),
    onSuccess: () => {
      setRequestResetId(null)
      setNewPassword('')
      qc.invalidateQueries({ queryKey: ['users', 'reset-requests'] })
      alert('Пароль обновлен, заявка закрыта')
    },
  })

  // 5. Мутация для отклонения заявки на сброс
  const dismissResetRequest = useMutation({
    mutationFn: (requestId: number) => api.delete(`/users/reset-requests/${requestId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users', 'reset-requests'] }) },
  })

  return (
    <div className="min-h-screen font-sans">
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">⚙️ Администрирование</h1>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200">← К статьям</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* 2. ВСТАВЛЯЕМ КОМПОНЕНТ ХЛЕБНЫХ КРОШЕК */}
        <Breadcrumbs />

        {/* НОВЫЙ БЛОК: Заявки на сброс пароля */}
        {resetRequests && resetRequests.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4 flex items-center">
              Заявки на сброс пароля
              <span className="ml-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full">
                {resetRequests.length}
              </span>
            </h2>
            <div className="space-y-2">
              {resetRequests.map(req => (
                <div key={req.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-orange-100 dark:border-orange-900/30 flex flex-col transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-800 dark:text-slate-200 font-medium">
                      {req.email} <span className="text-gray-400 dark:text-slate-500 text-sm font-normal ml-2">просит сбросить пароль</span>
                    </span>
                    
                    <div className="flex gap-2">
                      {requestResetId !== req.id && (
                        <button
                          onClick={() => setRequestResetId(req.id)}
                          className="text-teal-600 dark:text-teal-400 hover:bg-blue-50 dark:hover:bg-teal-900/30 px-3 py-1.5 rounded-lg text-sm transition"
                        >
                          Задать новый пароль
                        </button>
                      )}
                      <button
                        onClick={() => dismissResetRequest.mutate(req.id)}
                        className="text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm transition"
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>

                  {/* Форма генерации пароля по заявке */}
                  {requestResetId === req.id && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                      <input
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Введите новый пароль"
                        className="border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-1.5 text-sm flex-1"
                      />
                      <button
                        onClick={() => resolveResetRequest.mutate({ 
                          requestId: req.id, 
                          userId: req.user_id, 
                          password: newPassword 
                        })}
                        disabled={!newPassword}
                        className="bg-orange-500 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50 hover:bg-orange-600 transition"
                      >
                        Сохранить и закрыть заявку
                      </button>
                      <button
                        onClick={() => {
                          setRequestResetId(null)
                          setNewPassword('')
                        }}
                        className="text-gray-500 dark:text-slate-400 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        Отмена
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ожидают подтверждения */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">
            Ожидают подтверждения
            {pending?.length ? <span className="ml-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full">{pending.length}</span> : null}
          </h2>
          {!pending?.length ? (
            <p className="text-gray-400 dark:text-slate-500 text-sm">Нет заявок на регистрации</p>
          ) : (
            <div className="space-y-2">
              {pending.map(user => (
                <div key={user.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 flex items-center justify-between transition-colors">
                  <span className="text-gray-800 dark:text-slate-200">{user.email}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approve.mutate(user.id)}
                      className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-600 transition"
                    >
                      Одобрить
                    </button>
                    <button
                      onClick={() => reject.mutate(user.id)}
                      className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600 transition"
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Все пользователи */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4">Все пользователи</h2>
          <div className="space-y-2">
            {allUsers?.filter(u => u.is_active).map(user => (
              <div key={user.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700 flex flex-col transition-colors">
                
                {/* Основная информация и выбор роли */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-gray-800 dark:text-slate-200">{user.email}</span>
                    
                    {/* Кнопка сброса пароля */}
                    {resetId !== user.id && (
                      <button
                        onClick={() => {
                          setResetId(user.id)
                          setNewPassword('') 
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 ml-3 transition-colors"
                      >
                        🔑 Сбросить пароль
                      </button>
                    )}
                  </div>

                  <select
                    value={user.role}
                    onChange={e => setRole.mutate({ id: user.id, role: e.target.value })}
                    className="text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Форма ручного сброса пароля */}
                {resetId === user.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-slate-700">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Новый пароль"
                      className="border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-1.5 text-sm flex-1 outline-none focus:border-teal-500 transition-colors"
                    />
                    <button
                      onClick={() => resetPassword.mutate({ id: user.id, password: newPassword })}
                      disabled={!newPassword}
                      className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50 hover:bg-teal-700 transition-colors"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => {
                        setResetId(null)
                        setNewPassword('')
                      }}
                      className="text-gray-400 dark:text-slate-400 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                )}

              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
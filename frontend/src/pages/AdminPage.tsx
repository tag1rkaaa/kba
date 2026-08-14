import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { articlesApi } from '../api/articles'

export default function AdminPage() {
  const qc = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'feedback' | 'audit'>('users')
  const [feedbackFilter, setFeedbackFilter] = useState<'new' | 'all'>('new')

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users/').then(r => r.data),
    enabled: activeTab === 'users',
  })

  const { data: pendingUsers } = useQuery({
    queryKey: ['pending-users'],
    queryFn: () => api.get('/users/pending').then(r => r.data),
    enabled: activeTab === 'requests',
  })

  const { data: resetRequests } = useQuery({
    queryKey: ['reset-requests'],
    queryFn: () => api.get('/users/reset-requests').then(r => r.data),
    enabled: activeTab === 'requests',
  })

  const { data: auditLog } = useQuery({
    queryKey: ['audit-log'],
    queryFn: () => api.get('/users/audit-log').then(r => r.data),
    enabled: activeTab === 'audit',
  })

  const { data: feedbacks } = useQuery({
    queryKey: ['feedbacks', feedbackFilter],
    queryFn: () => articlesApi.getFeedback(feedbackFilter),
    enabled: activeTab === 'feedback',
  })

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/approve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['pending-users'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: number) => api.post(`/users/${id}/reject`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending-users'] }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) => 
      api.patch(`/users/${id}/role`, null, { params: { role } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const resolveFeedbackMutation = useMutation({
    mutationFn: (id: number) => articlesApi.resolveFeedback(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedbacks'] }),
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Дата неизвестна';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Дата неизвестна' : date.toLocaleDateString('ru');
  }

  if (usersLoading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400">
      Загрузка панели администратора...
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans transition-colors duration-200">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Панель управления</h1>
            <Link to="/" className="text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium md:hidden">
              На главную
            </Link>
          </div>
          
          <nav className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl overflow-x-auto">
            {[
              { id: 'users', label: 'Пользователи' },
              { id: 'requests', label: 'Заявки' },
              { id: 'feedback', label: 'Жалобы' },
              { id: 'audit', label: 'Логи' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          
          <Link to="/" className="text-teal-600 hover:text-teal-700 dark:text-teal-400 font-medium hidden md:block">
            Вернуться на главную
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {activeTab === 'users' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Активные пользователи</h2>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium">Email</th>
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium">Роль</th>
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {users?.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                          u.role === 'editor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          u.role === 'moderator' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        <select
                          value={u.role}
                          onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-teal-500"
                        >
                          <option value="viewer">Читатель</option>
                          <option value="editor">Редактор</option>
                          <option value="moderator">Модератор</option>
                          <option value="admin">Админ</option>
                        </select>
                        <button
                          onClick={() => {
                            if (confirm(`Вы уверены, что хотите закрыть доступ пользователю ${u.email}?`)) {
                              deleteUserMutation.mutate(u.id)
                            }
                          }}
                          className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 px-3 py-1.5 rounded-lg transition-colors text-xs font-semibold"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'requests' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Ожидают подтверждения</h2>
              {(!pendingUsers || pendingUsers.length === 0) ? (
                <p className="text-slate-500">Нет новых заявок.</p>
              ) : (
                <div className="grid gap-3">
                  {pendingUsers.map((u: any) => (
                    <div key={u.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{u.email}</p>
                        <p className="text-sm text-slate-500">Регистрация: {formatDate(u.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => approveMutation.mutate(u.id)}
                          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          Одобрить
                        </button>
                        <button 
                          onClick={() => rejectMutation.mutate(u.id)}
                          className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Заявки на сброс пароля</h2>
              {(!resetRequests || resetRequests.length === 0) ? (
                <p className="text-slate-500">Нет заявок на сброс.</p>
              ) : (
                <div className="grid gap-3">
                  {resetRequests.map((req: any) => (
                    <div key={req.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{req.email}</p>
                        <p className="text-sm text-slate-500">Запрос от: {formatDate(req.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const newPwd = prompt('Введите новый временный пароль для пользователя:')
                            if (newPwd) {
                              api.post(`/users/reset-requests/${req.id}/resolve`, { user_id: req.user_id, new_password: newPwd })
                                .then(() => qc.invalidateQueries({ queryKey: ['reset-requests'] }))
                            }
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          Сбросить пароль
                        </button>
                        <button 
                          onClick={() => {
                            api.delete(`/users/reset-requests/${req.id}`)
                              .then(() => qc.invalidateQueries({ queryKey: ['reset-requests'] }))
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition"
                        >
                          Отклонить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'feedback' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Сообщения об ошибках</h2>
              
              <select 
                value={feedbackFilter} 
                onChange={(e) => setFeedbackFilter(e.target.value as 'new' | 'all')}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500 text-slate-700 dark:text-slate-300"
              >
                <option value="new">Только новые</option>
                <option value="all">Все (Архив)</option>
              </select>
            </div>

            {(!feedbacks || feedbacks.length === 0) ? (
              <div className="text-slate-400 dark:text-slate-500 text-sm py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                {feedbackFilter === 'new' ? 'Новых жалоб нет.' : 'Архив пуст.'}
              </div>
            ) : (
              <div className="grid gap-3">
                {feedbacks.map((f: any) => (
                  <div 
                    key={f.id} 
                    className={`bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 justify-between transition-colors ${
                      f.status === 'new' 
                        ? 'border-rose-200 dark:border-rose-900/50' 
                        : 'border-emerald-200 dark:border-emerald-900/50 opacity-75'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          f.status === 'new' 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }`}>
                          {f.status === 'new' ? 'Нужно исправить' : 'Исправлено'}
                        </span>
                        <Link 
                          to={`/articles/${f.article_id}`} 
                          className="font-semibold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 transition-colors truncate"
                        >
                          {f.article_title}
                        </Link>
                      </div>
                      
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mt-2 whitespace-pre-wrap">
                        {f.message}
                      </p>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                        Отправил(а): {f.user_email} • {new Date(f.created_at).toLocaleString('ru', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    
                    {f.status === 'new' && (
                      <div className="shrink-0 flex items-start md:items-center">
                        <button
                          onClick={() => resolveFeedbackMutation.mutate(f.id)}
                          disabled={resolveFeedbackMutation.isPending}
                          className="bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/50 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          Отметить как решённое
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'audit' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">
              История изменений
            </h2>
            <div className="space-y-2">
              {auditLog?.map((entry: any) => (
                <div 
                  key={entry.id} 
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between shadow-sm transition-colors gap-3 sm:gap-0"
                >
                  <div className="flex items-center flex-wrap gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      entry.action === 'create' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      entry.action === 'update' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                    }`}>
                      {entry.action === 'create' ? 'Создал' :
                      entry.action === 'update' ? 'Изменил' : 'Архивировал'}
                    </span>
                    
                    <span className="text-sm text-slate-700 dark:text-slate-200 font-medium ml-1">
                      {entry.user_email}
                    </span>
                    
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      статью #{entry.entity_id}
                      {entry.diff?.title && <span className="italic"> «{entry.diff.title}»</span>}
                    </span>
                  </div>
                  
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium shrink-0">
                    {new Date(entry.created_at).toLocaleString('ru', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              ))}
              
              {(!auditLog || auditLog.length === 0) && (
                <div className="text-slate-400 dark:text-slate-500 text-sm py-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-xl transition-colors">
                  Действий пока нет
                </div>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
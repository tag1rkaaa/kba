import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { articlesApi } from '../api/articles'
import { authApi } from '../api/auth'
import { favoritesApi } from '../api/favorites'

import Breadcrumbs from '../components/Breadcrumbs'

interface ArticleItem {
  id: number | string
  number?: number | string
  title: string
}

export default function ArticleViewPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const qc       = useQueryClient()

  const fromCategory = location.state?.fromCategory

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => authApi.me() })

  const { data: article, isLoading } = useQuery({
    queryKey: ['article', id],
    queryFn:  () => articlesApi.get(Number(id)),
    enabled:  !!id,
  })

  const { data: allArticles } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesApi.list(),
  })

  const { data: favStatus, refetch: refetchFav } = useQuery({
    queryKey: ['favorite-status', id],
    queryFn:  () => favoritesApi.status(Number(id)),
    enabled:  !!id,
  })

  const canEdit   = me?.role && ['editor', 'moderator', 'admin'].includes(me.role)
  const canDelete = me?.role && ['moderator', 'admin'].includes(me.role)
  const isFav     = favStatus?.is_favorite ?? false

  // СОСТОЯНИЯ ДЛЯ ОКНА ОБРАТНОЙ СВЯЗИ
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isFeedbackSuccess, setIsFeedbackSuccess] = useState(false)

  // СОСТОЯНИЕ ДЛЯ ОКНА ИСТОРИИ
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // МУТАЦИЯ ДЛЯ ОТПРАВКИ ОБРАТНОЙ СВЯЗИ
  const feedbackMutation = useMutation({
    // @ts-ignore
    mutationFn: () => articlesApi.sendFeedback(Number(id), feedbackMessage),
    onSuccess: () => {
      setIsFeedbackSuccess(true)
      setFeedbackMessage('')
      setTimeout(() => {
        setIsFeedbackOpen(false)
        setIsFeedbackSuccess(false)
      }, 3000) // Закроется само через 3 секунды
    },
  })

  // ЗАПРОС ИСТОРИИ ВЕРСИЙ
  const { data: revisions, isLoading: revisionsLoading } = useQuery({
    queryKey: ['revisions', id],
    queryFn: () => articlesApi.getRevisions(Number(id)),
    enabled: isHistoryOpen && !!id, // Грузим только если окно открыто
  })

  // МУТАЦИЯ ДЛЯ ВОССТАНОВЛЕНИЯ ВЕРСИИ
  const restoreMutation = useMutation({
    // @ts-ignore
    mutationFn: (revisionId: number) => articlesApi.restoreRevision(Number(id), revisionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['article', id] }) // Обновляем статью на экране
      setIsHistoryOpen(false)
      alert('Версия успешно восстановлена!')
    },
  })

  useEffect(() => {
    if (article && id) {
      const historyKey = 'recently_viewed_articles'
      const prev: ArticleItem[] = JSON.parse(localStorage.getItem(historyKey) || '[]')
      const filtered = prev.filter(item => String(item.id) !== String(id))
      const updated = [{ id: article.id, number: article.number, title: article.title }, ...filtered].slice(0, 5)
      localStorage.setItem(historyKey, JSON.stringify(updated))
    }
  }, [article, id])

  const deleteMutation = useMutation({
    mutationFn: () => articlesApi.delete(Number(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['articles'] })
      navigate('/')
    },
  })

  const favMutation = useMutation({
    mutationFn: () => isFav
      ? favoritesApi.remove(Number(id))
      : favoritesApi.add(Number(id)),
    onSuccess: () => {
      refetchFav()
      qc.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const handleDelete = () => {
    if (confirm('Удалить статью? Это действие нельзя отменить.')) {
      deleteMutation.mutate()
    }
  }

  const handleBack = () => {
    if (location.state && location.state.fromCategory !== undefined) {
      navigate('/', { state: { restoreCategory: location.state.fromCategory } })
    } else {
      navigate(-1)
    }
  }

  const editor = useEditor({
    extensions: [StarterKit],
    editable: false,
    editorProps: {
      attributes: { class: 'prose dark:prose-invert max-w-none focus:outline-none p-6' },
    },
  })

  useEffect(() => {
    if (article && editor) {
      editor.commands.setContent(article.content as any)
    }
  }, [article, editor])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-slate-400 transition-colors">
      Загрузка...
    </div>
  )

  if (!article) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500 dark:text-slate-400 transition-colors">
      Статья не найдена
    </div>
  )

  return (
    <div className="min-h-screen font-sans transition-colors duration-200">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button 
            onClick={handleBack} 
            className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 text-sm transition-colors"
          >
            ← Назад
          </button>
          <div className="flex items-center gap-3">
            {canEdit && (
              <>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 px-4 py-1.5 rounded-lg text-sm transition"
                >
                  История
                </button>
                <Link
                  to={`/articles/${id}/edit`}
                  className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-teal-700 transition"
                >
                  Редактировать
                </Link>
              </>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-600 transition disabled:opacity-50"
              >
                Удалить
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex gap-6">
        <div className="flex-1 min-w-0 space-y-8">
          
          <div>
            <Breadcrumbs fromCategory={fromCategory} articleCategory={article.source} />

            <div className="flex items-center gap-3 mb-2 mt-4">
              {article.number && (
                <span className="text-sm font-mono bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 px-2 py-1 rounded transition-colors">
                  #{article.number}
                </span>
              )}
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white transition-colors">{article.title}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              {article.status !== 'published' && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 transition-colors">
                  Черновик
                </span>
              )}

              {article.source && (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-indigo-900/30 text-teal-600 dark:text-teal-400 transition-colors">
                  {article.source}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-slate-500 transition-colors">
                {new Date(article.updated_at).toLocaleDateString('ru', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map((tag: any) => (
                  <span key={tag.id} className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors">
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* КНОПКА СООБЩИТЬ ОБ ОШИБКЕ */}
            <div className="mb-6">
              <button
                onClick={() => setIsFeedbackOpen(true)}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Сообщить о неточности
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
              <EditorContent editor={editor} />
            </div>
          </div>

          <RelatedArticles currentArticle={article} articles={allArticles ?? []} />

        </div>

        <div className="w-72 shrink-0 hidden lg:block space-y-6">
          <FavoritesPanel 
            isFav={isFav} 
            onToggle={() => favMutation.mutate()} 
            isPending={favMutation.isPending} 
          />
          <RecentlyViewedPanel />
        </div>

        {/* МОДАЛЬНОЕ ОКНО ДЛЯ ОБРАТНОЙ СВЯЗИ */}
        {isFeedbackOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  Сообщить о неточности
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Если вы заметили устаревшие данные, неработающую ссылку или ошибку, опишите её ниже. Модераторы исправят статью.
                </p>

                {isFeedbackSuccess ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-center font-medium border border-emerald-100 dark:border-emerald-800">
                    🎉 Спасибо! Ваше сообщение отправлено модераторам.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Например: Изменился номер регистратуры, теперь это 8 (800) 555-35-35..."
                      className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 dark:text-slate-200 resize-none"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setIsFeedbackOpen(false)}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => feedbackMutation.mutate()}
                        disabled={!feedbackMessage.trim() || feedbackMutation.isPending}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm"
                      >
                        {feedbackMutation.isPending ? 'Отправка...' : 'Отправить'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* МОДАЛЬНОЕ ОКНО ИСТОРИИ ВЕРСИЙ */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[80vh]">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  История версий
                </h3>
                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  ✕
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                {revisionsLoading ? (
                  <p className="text-center text-slate-500">Загрузка истории...</p>
                ) : !revisions || revisions.length === 0 ? (
                  <p className="text-center text-slate-500">У этой статьи пока нет старых версий.</p>
                ) : (
                  revisions.map((rev: any) => (
                    <div key={rev.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Версия {rev.version}
                          </span>
                          {article.version === rev.version && (
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">Текущая</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(rev.created_at).toLocaleString('ru', {
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      
                      {article.version !== rev.version && (
                        <button
                          onClick={() => {
                            if (confirm(`Восстановить текст до версии ${rev.version}? Текущий текст будет заменен.`)) {
                              restoreMutation.mutate(rev.id)
                            }
                          }}
                          disabled={restoreMutation.isPending}
                          className="text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 hover:border-teal-500 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg transition"
                        >
                          Восстановить
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function RelatedArticles({ currentArticle, articles }: { currentArticle: any; articles: any[] }) {
  const related = articles
    .filter(a => String(a.id) !== String(currentArticle.id))
    .map(a => {
      let score = 0
      if (currentArticle.category_id && a.category_id && currentArticle.category_id === a.category_id) {
        score += 3
      }
      const currentTags = currentArticle.tags?.map((t: any) => t.name) || []
      const aTags = a.tags?.map((t: any) => t.name) || []
      const commonTags = currentTags.filter((t: string) => aTags.includes(t))
      score += commonTags.length * 2

      return { article: a, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.article)

  if (!related || related.length === 0) return null

  return (
    <section className="mt-12 pt-6 border-t border-gray-200 dark:border-slate-800 transition-colors">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 transition-colors">
        Похожие статьи
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {related.map(art => (
          <Link
            key={art.id}
            to={`/articles/${art.id}`}
            className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 transition-all flex flex-col justify-between group h-full"
          >
            <div>
              {art.number && (
                <span className="text-xs text-gray-400 dark:text-slate-500 font-mono mb-1 inline-block">
                  #{art.number}
                </span>
              )}
              <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors whitespace-normal wrap-break-word leading-snug">
                {art.title}
              </h3>
            </div>
            {art.description && (
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 line-clamp-2">
                {art.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}

function FavoritesPanel({ isFav, onToggle, isPending }: { isFav?: boolean; onToggle?: () => void; isPending?: boolean }) {
  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn:  () => favoritesApi.list(),
  })

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 transition-colors space-y-4">
      {onToggle !== undefined && (
        <button
          onClick={onToggle}
          disabled={isPending}
          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
            isFav
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
          }`}
        >
          {isFav ? 'В избранном' : 'В избранное'}
        </button>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
          Избранное
          {favorites && favorites.length > 0 && (
            <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs px-1.5 py-0.5 rounded-full">
              {favorites.length}
            </span>
          )}
        </h2>

        {!favorites || favorites.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-slate-500">Нажмите на кнопку добавления, чтобы сохранить статью.</p>
        ) : (
          <div className="space-y-1">
            {favorites.map(article => (
              <Link
                key={article.id}
                to={`/articles/${article.id}`}
                className="block text-sm text-gray-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-blue-50 dark:hover:bg-teal-900/30 px-2 py-1.5 rounded-lg transition truncate"
                title={article.title}
              >
                {article.number && (
                  <span className="text-gray-400 dark:text-slate-500 text-xs mr-1">#{article.number}</span>
                )}
                {article.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RecentlyViewedPanel() {
  const [history, setHistory] = useState<ArticleItem[]>([])
  const { id } = useParams()

  useEffect(() => {
    const historyKey = 'recently_viewed_articles'
    const prev: ArticleItem[] = JSON.parse(localStorage.getItem(historyKey) || '[]')
    setHistory(prev)
  }, [id])

  if (!history || history.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 transition-colors">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
        Недавно просмотрено
      </h2>
      <div className="space-y-1">
        {history.map(article => (
          <Link
            key={article.id}
            to={`/articles/${article.id}`}
            className="block text-sm text-gray-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-blue-50 dark:hover:bg-teal-900/30 px-2 py-1.5 rounded-lg transition truncate"
            title={article.title}
          >
            {article.number && (
              <span className="text-gray-400 dark:text-slate-500 text-xs mr-1">#{article.number}</span>
            )}
            {article.title}
          </Link>
        ))}
      </div>
    </div>
  )
}
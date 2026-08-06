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
              <Link
                to={`/articles/${id}/edit`}
                className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-teal-700 transition"
              >
                Редактировать
              </Link>
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
              <div className="flex flex-wrap gap-2 mb-6">
                {article.tags.map((tag: any) => (
                  <span key={tag.id} className="text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 transition-colors">
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}

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
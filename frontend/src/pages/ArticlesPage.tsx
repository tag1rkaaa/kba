import { useState } from 'react'
// Добавили useInfiniteQuery
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { articlesApi } from '../api/articles'
import { authApi } from '../api/auth'
import { sourcesApi } from '../api/sources'
import SearchBar from '../components/SearchBar'
import FavoritesPanel from '../components/FavoritesPanel'
import logo from '../assets/logo.png' 
import { useTheme } from '../providers/ThemeProvider'


const SPECIFIC_COLORS: Record<string, string> = {
  'Здравоохранение': 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800',
  'Топливо': 'bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800',
}

const CATEGORY_COLORS = [
  "bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800",
  "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
  "bg-cyan-50 text-cyan-600 border border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-800",
  "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  "bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 dark:border-fuchsia-800",
  "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
];

function getCategoryColor(categoryName: string) {
  if (!categoryName) return CATEGORY_COLORS[0];
  
  if (SPECIFIC_COLORS[categoryName]) {
    return SPECIFIC_COLORS[categoryName];
  }
  
  let hash = 0;
  for (let i = 0; i < categoryName.length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
}

export default function ArticlesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Состояние категории
  const [source, setSource] = useState<string>(location.state?.restoreCategory || '')
  
  const { theme, setTheme } = useTheme()

  const { data: me, isLoading: isMeLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(),
  })

  const { data: sources, isLoading: isSourcesLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => sourcesApi.list(),
    enabled: !!me,
  })

  // ИСПОЛЬЗУЕМ useInfiniteQuery ДЛЯ ПОДГРУЗКИ
  const { 
    data, 
    isLoading: isArticlesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['articles', source], // Теперь при смене категории запрос обновится сам!
    queryFn: ({ pageParam }) => articlesApi.list({ page: pageParam as number, source }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Предполагаем, что сервер отдает максимум 20 (или 50) статей за раз.
      // Если пришло меньше (или 0), значит это последняя страница, больше не грузим.
      return lastPage.length > 0 ? allPages.length + 1 : undefined;
    },
  })

  const isLoading = isMeLoading || isSourcesLoading || isArticlesLoading

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    navigate('/login')
  }

  const filteredSources = sources?.filter(
    s => !s.toLowerCase().includes('минторг') && !s.toLowerCase().includes('правительство')
  )

  // Объединяем все загруженные страницы в один плоский массив статей
  const displayedArticles = data?.pages.flat() || [];

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Загрузка знаний...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen font-sans">
      
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img 
              src={logo} 
              alt="Логотип ЦУР" 
              className="w-10 h-10 object-contain transition-transform group-hover:scale-105" 
            />
            <h1 className="text-xl font-bold text-slate-800 dark:text-white transition-colors">
              ЦУР <span className="text-teal-600">Знание</span>
            </h1>
          </Link>

          <div className="w-full max-w-xl shrink-0">
            <SearchBar />
          </div>

          <div className="flex gap-4 shrink-0 items-center ml-auto">
            
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Переключить тему"
            >
              {theme === 'dark' ? 'Светлая' : 'Тёмная'}
            </button>

            {me?.role !== 'viewer' && (
              <Link
                to="/articles/new"
                className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm shadow-teal-200 dark:shadow-none hover:bg-teal-700 hover:shadow-teal-300 dark:hover:shadow-none transition-all active:scale-95"
              >
                + Создать статью
              </Link>
            )}
            {(me?.role === 'admin' || me?.role === 'moderator') && (
              <Link to="/import" className="text-slate-500 hover:text-teal-600 text-sm font-medium transition-colors">
                Импорт
              </Link>
            )}
            {me?.role === 'admin' && (
              <Link to="/admin" className="text-slate-500 hover:text-teal-600 text-sm font-medium transition-colors">
                Админ
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-500 text-sm font-medium px-2 transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex gap-6">
        
        <div className="w-72 shrink-0 hidden md:block">
          {filteredSources && filteredSources.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 sticky top-24 transition-colors space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 px-2">
                Категории
              </h3>
              <button
                onClick={() => setSource('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  source === '' 
                    ? 'bg-slate-800 text-white shadow-md dark:bg-slate-200 dark:text-slate-900' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                Все источники
              </button>
              {filteredSources.map(s => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-normal wrap-break-word leading-snug ${
                    source === s 
                      ? 'bg-slate-800 text-white shadow-md dark:bg-slate-200 dark:text-slate-900' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          
          {displayedArticles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 border-dashed transition-colors">
              <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">В этом разделе пока нет статей</p>
              {me?.role !== 'viewer' && (
                <Link to="/articles/new" className="text-teal-600 font-semibold hover:underline mt-2">
                  Написать первую статью →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedArticles.map(article => (
                <Link
                  key={article.id}
                  to={`/articles/${article.id}`}
                  state={{ fromCategory: source }}
                  className="block bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-500 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors leading-snug">
                        {article.number && (
                          <span className="text-slate-400 font-medium text-sm mr-2.5 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
                            #{article.number}
                          </span>
                        )}
                        {article.title}
                      </h2>
                      
                      {(article.description || article.content_plain) && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed">
                          {article.description || article.content_plain}
                        </p>
                      )}
                      
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3.5" onClick={e => e.preventDefault()}>
                          {article.tags.map((tag: any) => (
                            <span
                              key={tag.id}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/search?q=${tag.name}&tag=${tag.slug}`)
                              }}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-600 hover:bg-teal-50 dark:hover:bg-teal-900/50 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-200 dark:hover:border-teal-700 cursor-pointer transition-all"
                            >
                              #{tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1">
                          {new Date(article.updated_at).toLocaleDateString('ru', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {article.status !== 'published' && (
                        <span className="text-xs px-3 py-1 font-semibold rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
                          Черновик
                        </span>
                      )}
                      
                      {article.source && (
                        <span className={`text-[11px] px-2.5 py-1 font-medium rounded-lg transition-colors ${getCategoryColor(article.source)}`}>
                          {article.source}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}

              {/* КНОПКА ЗАГРУЗИТЬ ЕЩЕ */}
              {hasNextPage && (
                <div className="flex justify-center mt-8 pb-4">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetchingNextPage ? 'Загрузка...' : 'Загрузить еще ↓'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-72 shrink-0 hidden lg:block">
          <FavoritesPanel />
        </div>

      </main>
    </div>
  )
}
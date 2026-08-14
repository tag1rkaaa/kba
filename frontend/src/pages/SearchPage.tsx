import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '../api/search'
import SearchBar from '../components/SearchBar'
import Breadcrumbs from '../components/Breadcrumbs'
import logo from '../assets/logo2.svg'
import { useTheme } from '../providers/ThemeProvider' // <-- Импортируем хук темы

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''

  // Достаем тему и функцию переключения
  const { theme, setTheme } = useTheme()

  const { data, isLoading } = useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.search(q),
    enabled: !!q,
  })

  return (
    <div className="min-h-screen font-sans transition-colors duration-200">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          
          {/* Логотип и Название */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img 
              src={logo} 
              alt="Логотип ЦУР" 
              className="w-10 h-10 object-contain transition-transform group-hover:scale-105" 
            />
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white transition-colors">
              ЦУР <span className="text-teal-600 dark:text-teal-400">Знание</span>
            </h1>
          </Link>

          <div className="w-full max-w-xl shrink-0">
            <SearchBar />
          </div>

          <div className="flex gap-4 shrink-0 items-center ml-auto">
            {/* Кнопка переключения темы */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Переключить тему"
            >
              {theme === 'dark' ? '🌞' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        
        <Breadcrumbs />

        {q && (
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 transition-colors">
            {isLoading ? 'Поиск...' : `Найдено: ${data?.total_count ?? 0} за ${data?.time_ms ?? 0} мс`}
          </p>
        )}

        <div className="space-y-4">
          {data?.hits.map(hit => (
            <Link
              key={hit.id}
              to={`/articles/${hit.id}`}
              className="block bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-500"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 transition-colors">{hit.title}</h2>
              <p
                className="text-sm text-gray-500 dark:text-slate-400 transition-colors"
                dangerouslySetInnerHTML={{ __html: hit.excerpt }}
              />
            </Link>
          ))}

          {data?.hits.length === 0 && (
            <div className="text-center py-20 text-gray-400 dark:text-slate-500 transition-colors">
              <p>По запросу «{q}» ничего не найдено</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
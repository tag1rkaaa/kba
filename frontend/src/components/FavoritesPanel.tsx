import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { favoritesApi } from '../api/favorites'

export default function FavoritesPanel() {
  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn:  () => favoritesApi.list(),
  })

  if (isLoading) return null

  return (
    <aside className="w-64 shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-24">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          Избранное
          {favorites && favorites.length > 0 && (
            <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full">
              {favorites.length}
            </span>
          )}
        </h2>

        {!favorites || favorites.length === 0 ? (
          <p className="text-xs text-gray-400">
            Нет избранных статей. Нажмите "В избранное" на любой статье.
          </p>
        ) : (
          <div className="space-y-1">
            {favorites.map(article => (
              <Link
                key={article.id}
                to={`/articles/${article.id}`}
                className="block text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-lg transition truncate"
                title={article.title}
              >
                {article.number && (
                  <span className="text-gray-400 text-xs mr-1">#{article.number}</span>
                )}
                {article.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
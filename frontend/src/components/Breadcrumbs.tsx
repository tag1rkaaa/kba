import { Link, useLocation } from 'react-router-dom'

// Словарь названий для страниц
const routeNames: Record<string, string> = {
  'new': 'Новая статья',
  'admin': 'Администрирование',
  'import': 'Импорт',
  'register': 'Регистрация',
  'search': 'Результаты поиска',
  'edit': 'Редактирование',
}

export default function Breadcrumbs() {
  const location = useLocation()
  
  // Разбиваем текущий путь на сегменты
  const pathnames = location.pathname.split('/').filter(x => x)

  // Если мы на главной странице — крошки не показываем
  if (pathnames.length === 0 || (pathnames.length === 1 && pathnames[0] === 'articles')) {
    return null
  }

  return (
    <nav className="flex text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
      <ol className="inline-flex items-center">
        
        {/* Ссылка на главную страницу */}
        <li className="inline-flex items-center">
          <Link to="/" className="hover:text-blue-600 transition">
            🏠 Главная
          </Link>
        </li>

        {pathnames.map((value, index) => {
          // Игнорируем сегмент 'articles', так как "Главная" уже ведет на список статей
          if (value === 'articles') return null

          const isLast = index === pathnames.length - 1
          const to = `/${pathnames.slice(0, index + 1).join('/')}`

          let name = routeNames[value] || value

          // Если в словаре нет перевода и это число — значит ID статьи
          if (!routeNames[value] && !isNaN(Number(value))) {
            name = `Статья #${value}`
          }

          return (
            <li key={to} className="flex items-center">
              <span className="mx-2 text-gray-300">/</span>
              {isLast ? (
                <span className="text-gray-800 font-medium">{name}</span>
              ) : (
                <Link to={to} className="hover:text-blue-600 transition">
                  {name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
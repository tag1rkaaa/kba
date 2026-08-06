import { Link } from 'react-router-dom'

interface BreadcrumbsProps {
  fromCategory?: string;
  articleCategory?: string;
}

export default function Breadcrumbs({ fromCategory, articleCategory }: BreadcrumbsProps) {
  const categoryName = fromCategory || articleCategory || 'Все статьи';

  return (
    <nav className="flex items-center text-sm text-gray-500 dark:text-slate-400 space-x-2">
      <Link 
        to="/" 
        state={{ restoreCategory: '' }} 
        className="hover:text-teal-600 transition-colors"
      >
        Главная
      </Link>
      
      <span>/</span>
      
      <Link 
        to="/" 
        state={{ restoreCategory: categoryName !== 'Все статьи' ? categoryName : '' }}
        className="hover:text-teal-600 transition-colors"
      >
        {categoryName}
      </Link>
    </nav>
  )
}
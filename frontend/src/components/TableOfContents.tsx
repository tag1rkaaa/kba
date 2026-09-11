// Убрали неиспользуемый импорт React
// Добавили слово type перед импортом интерфейса
import type { TocItem } from '../hooks/useTableOfContents';

interface TableOfContentsProps {
  items: TocItem[];
}

export default function TableOfContents({ items }: TableOfContentsProps) {
  if (!items || items.length === 0) return null;

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 transition-colors sticky top-24">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
        Содержание
      </h3>
      <ul className="space-y-2.5 text-sm">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 2) * 12}px` }} 
          >
            <button
              onClick={() => scrollTo(item.id)}
              className="text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 text-left transition-colors line-clamp-2 leading-snug"
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
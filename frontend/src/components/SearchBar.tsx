import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchApi } from '../api/search'

export default function SearchBar() {
  const [q, setQ]               = useState('')
  const [suggestions, setSuggestions] = useState<{ id: number; title: string; excerpt?: string }[]>([])
  const [open, setOpen]         = useState(false)
  const navigate                = useNavigate()
  const timer                   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref                     = useRef<HTMLDivElement>(null)

  // Закрываем список при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleChange = (value: string) => {
    setQ(value)
    if (timer.current) clearTimeout(timer.current)

    if (value.trim().length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }

    timer.current = setTimeout(async () => {
      try {
        const data = await searchApi.search(value)
        // Установили лимит до 8 результатов
        setSuggestions(data.hits.slice(0, 8).map((h: any) => ({ 
          id: h.id, 
          title: h.title, 
          excerpt: h.excerpt 
        })))
        setOpen(true)
      } catch {
        setSuggestions([])
      }
    }, 300)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setOpen(false)
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleSelect = (id: number) => {
    setOpen(false)
    setQ('')
    navigate(`/articles/${id}`)
  }

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Поиск по статьям..."
          className="flex-1 border border-slate-200 dark:border-slate-700 bg-white text-slate-800 placeholder-slate-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all shadow-sm"
        />
        <button
          type="submit"
          className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm hover:bg-teal-700 transition-colors active:scale-95"
        >
          Найти
        </button>
      </form>

      {/* Выпадающий список */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden max-h-[80vh] overflow-y-auto">
          {suggestions.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className="w-full text-left px-5 py-3 hover:bg-teal-50 transition-colors border-b border-slate-50 last:border-0 flex flex-col gap-1 group"
            >
              <div className="text-sm font-medium text-slate-700 group-hover:text-teal-700 flex items-center gap-2 transition-colors">
                <span className="text-slate-400 group-hover:text-teal-500 transition-colors"></span> {s.title}
              </div>
              
              {s.excerpt && (
                <div 
                  className="text-xs text-slate-500 line-clamp-2 pl-6"
                  dangerouslySetInnerHTML={{ __html: s.excerpt }} 
                />
              )}
            </button>
          ))}
          <div className="bg-slate-50/50 sticky bottom-0">
            <button
              onClick={handleSubmit as any}
              className="w-full text-left px-5 py-3 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50/80 transition-colors font-semibold"
            >
              Показать все результаты по «{q}» →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
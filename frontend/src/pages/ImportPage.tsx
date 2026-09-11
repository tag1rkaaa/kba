import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { sourcesApi, type Category } from '../api/sources'

// 1. ИМПОРТИРУЕМ КОМПОНЕНТ ХЛЕБНЫХ КРОШЕК
import Breadcrumbs from '../components/Breadcrumbs'

// Плоский список всех категорий из дерева
function flattenCategories(cats: Category[], depth = 0): { id: number; name: string; depth: number }[] {
  return cats.flatMap(c => [
    { id: c.id, name: c.name, depth },
    ...flattenCategories(c.children ?? [], depth + 1),
  ])
}

export default function ImportPage() {
  const [file, setFile]               = useState<File | null>(null)
  const [result, setResult]           = useState<any>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [categoryMode, setCategoryMode] = useState<'existing' | 'new'>('existing')
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('')
  const [newCategoryName, setNewCategoryName]   = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => sourcesApi.categories(),
  })

  const flatCategories = flattenCategories(categories ?? [])

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCategory(true)
    try {
      const cat = await sourcesApi.createCategory(newCategoryName.trim())
      await refetchCategories()
      setSelectedCategory(cat.id)
      setCategoryMode('existing')
      setNewCategoryName('')
    } catch {
      setError('Ошибка при создании категории')
    } finally {
      setCreatingCategory(false)
    }
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const categoryId = selectedCategory ? Number(selectedCategory) : null
      const isJson = file.name.endsWith('.json')
      const data = isJson
        ? await sourcesApi.importJson(file, categoryId)
        : await sourcesApi.importCsv(file, categoryId)
      setResult(data)
    } catch (e: any) {
      setError(e.response?.data?.detail ?? 'Ошибка импорта')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Убрали жесткий bg-gray-50
    <div className="min-h-screen font-sans transition-colors duration-200">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white transition-colors"> Импорт статей</h1>
          <Link to="/" className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors">← К статьям</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-4">

        {/* 2. ВСТАВЛЯЕМ ХЛЕБНЫЕ КРОШКИ */}
        <Breadcrumbs />

        {/* Формат файла */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-2 transition-colors">Формат файла</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 transition-colors">
            Поддерживаются JSON и CSV. Поля:
            <code className="bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded ml-1 transition-colors">title</code>,
            <code className="bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded ml-1 transition-colors">content</code>,
            <code className="bg-gray-100 dark:bg-slate-700 dark:text-slate-300 px-1 rounded ml-1 transition-colors">source</code> (опционально)
          </p>
          <div className="bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-700 rounded-lg p-4 text-xs font-mono text-gray-600 dark:text-slate-300 transition-colors">
{`[
  {
    "title": "Название статьи",
    "content": "Текст статьи",
    "source": "МФЦ"
  }
]`}
          </div>
        </div>

        {/* Категория */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4 transition-colors">Категория для импортируемых статей</h2>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setCategoryMode('existing')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                categoryMode === 'existing'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Выбрать существующую
            </button>
            <button
              onClick={() => setCategoryMode('new')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                categoryMode === 'new'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Создать новую
            </button>
          </div>

          {categoryMode === 'existing' ? (
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
              className="w-full border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            >
              <option value="">Без категории</option>
              {flatCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {'— '.repeat(cat.depth)}{cat.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Название новой категории"
                className="flex-1 border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
              />
              <button
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim() || creatingCategory}
                className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition disabled:opacity-50"
              >
                {creatingCategory ? '...' : 'Создать'}
              </button>
            </div>
          )}

          {selectedCategory && (
            <p className="text-sm text-green-600 dark:text-emerald-400 mt-2 transition-colors">
              Категория выбрана: {flatCategories.find(c => c.id === selectedCategory)?.name}
            </p>
          )}
        </div>

        {/* Загрузка файла */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4 transition-colors">Загрузка файла</h2>

          <div className="space-y-4">
            <input
              type="file"
              accept=".json,.csv"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:dark:bg-indigo-900/30 file:dark:text-indigo-400 hover:file:dark:bg-indigo-900/50 transition-colors"
            />

            {error && <p className="text-red-500 dark:text-red-400 text-sm transition-colors">{error}</p>}

            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 transition font-medium disabled:opacity-50"
            >
              {loading ? 'Импортируем...' : 'Начать импорт'}
            </button>
          </div>
        </div>

        {/* Результат */}
        {result && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 mb-4 transition-colors">Результат</h2>
            <p className="text-green-600 dark:text-emerald-400 font-medium mb-2 transition-colors">Импортировано: {result.imported}</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-500 dark:text-red-400 font-medium mb-1 transition-colors">Ошибки:</p>
                {result.errors.map((e: string, i: number) => (
                  <p key={i} className="text-sm text-red-400 dark:text-red-300 transition-colors">{e}</p>
                ))}
              </div>
            )}
            {result.titles.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-1 transition-colors">Загруженные статьи:</p>
                {result.titles.map((t: string, i: number) => (
                  <p key={i} className="text-sm text-gray-700 dark:text-slate-300 transition-colors">• {t}</p>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}
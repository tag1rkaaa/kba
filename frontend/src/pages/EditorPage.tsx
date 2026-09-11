import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { articlesApi } from '../api/articles'
import { sourcesApi } from '../api/sources'
import { tagsApi } from '../api/tags'

export default function EditorPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const isNew    = !id

  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus]           = useState('draft')
  const [categoryId, setCategoryId]   = useState<number | ''>('')
  const [tags, setTags]               = useState<string[]>([])
  const [tagInput, setTagInput]       = useState('')
  const [saving, setSaving]           = useState(false)

  // Состояния для создания новой категории
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCat, setCreatingCat]         = useState(false)

  // Загружаем категории и извлекаем функцию refetchCategories
  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: ['categories'],
    queryFn:  () => sourcesApi.categories(),
  })

  // Загружаем теги
  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn:  () => tagsApi.list(),
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Начните писать статью...' }),
    ],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: {
      // Добавили dark:prose-invert для текстового редактора
      attributes: { class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-4' },
    },
  })

  useEffect(() => {
    if (!isNew && id) {
      articlesApi.get(Number(id)).then(article => {
        setTitle(article.title)
        setDescription(article.description ?? '')
        setStatus(article.status)
        setCategoryId(article.category_id ?? '')
        setTags(article.tags?.map((t: any) => t.name) ?? [])
        editor?.commands.setContent(article.content as any)
      })
    }
  }, [id, editor, isNew])

  const handleSave = async () => {
    if (!title.trim()) return alert('Введите заголовок')
    setSaving(true)
    try {
      const payload = {
        title,
        description,
        content:     editor?.getJSON() ?? {},
        status,
        category_id: categoryId || null,
        tags,
      }
      if (isNew) {
        const article = await articlesApi.create(payload)
        navigate(`/articles/${article.id}`)
      } else {
        await articlesApi.update(Number(id), payload)
        navigate(`/articles/${id}`)
      }
    } catch {
      alert('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  // Функция создания новой категории
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    setCreatingCat(true)
    try {
      const cat = await sourcesApi.createCategory(newCategoryName.trim())
      await refetchCategories()
      setCategoryId(cat.id)
      setShowNewCategory(false)
      setNewCategoryName('')
    } catch {
      alert('Ошибка при создании категории')
    } finally {
      setCreatingCat(false)
    }
  }

  const addTag = (name: string) => {
    const cleaned = name.trim().toLowerCase()
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned])
    }
    setTagInput('')
  }

  const removeTag = (name: string) => {
    setTags(tags.filter(t => t !== name))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  // Плоский список категорий
  const flatCategories: { id: number; name: string; depth: number }[] = []
  const flatten = (cats: any[], depth = 0) => {
    cats.forEach(c => {
      flatCategories.push({ id: c.id, name: c.name, depth })
      if (c.children?.length) flatten(c.children, depth + 1)
    })
  }
  if (categories) flatten(categories)

  return (
    // Убрали bg-gray-50 для работы глобального стиля
    <div className="min-h-screen font-sans transition-colors duration-200">
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 text-sm transition-colors">
            ← Назад
          </button>
          <div className="flex items-center gap-3">
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликовать</option>
            </select>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-teal-700 transition disabled:opacity-50"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex gap-6">

        {/* Основной контент */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Заголовок статьи"
            className="w-full text-4xl font-bold text-gray-900 dark:text-white border-none outline-none bg-transparent mb-3 placeholder-gray-300 dark:placeholder-slate-600 transition-colors"
          />

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Краткое описание статьи (необязательно)"
            rows={2}
            className="w-full text-lg text-gray-500 dark:text-slate-400 border-none outline-none bg-transparent mb-4 resize-none placeholder-gray-300 dark:placeholder-slate-600 transition-colors"
          />

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
            <div className="border-b border-gray-100 dark:border-slate-700 px-4 py-2 flex gap-1 flex-wrap transition-colors">
              {[
                { label: 'B',       action: () => editor?.chain().focus().toggleBold().run(),                active: editor?.isActive('bold') },
                { label: 'I',       action: () => editor?.chain().focus().toggleItalic().run(),              active: editor?.isActive('italic') },
                { label: 'H1',      action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive('heading', { level: 1 }) },
                { label: 'H2',      action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive('heading', { level: 2 }) },
                { label: '• List',  action: () => editor?.chain().focus().toggleBulletList().run(),          active: editor?.isActive('bulletList') },
                { label: '1. List', action: () => editor?.chain().focus().toggleOrderedList().run(),         active: editor?.isActive('orderedList') },
                { label: '</>',     action: () => editor?.chain().focus().toggleCode().run(),                active: editor?.isActive('code') },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.action}
                  className={`px-3 py-1 text-sm rounded transition ${
                    btn.active 
                      ? 'bg-gray-900 dark:bg-teal-600 text-white' 
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Боковая панель — категория и теги */}
        <div className="w-56 shrink-0 space-y-4">

          {/* Категория */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 transition-colors">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 transition-colors">Категория</h3>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2 transition-colors"
            >
              <option value="">Без категории</option>
              {flatCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {'— '.repeat(cat.depth)}{cat.name}
                </option>
              ))}
            </select>

            {/* Создать новую категорию */}
            {!showNewCategory ? (
              <button
                onClick={() => setShowNewCategory(true)}
                className="text-xs text-blue-500 dark:text-teal-400 hover:underline transition-colors"
              >
                + Создать новую категорию
              </button>
            ) : (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="Название категории"
                  className="flex-1 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={!newCategoryName.trim() || creatingCat}
                  className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {creatingCat ? '...' : 'OK'}
                </button>
                <button
                  onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                  className="text-gray-400 dark:text-slate-500 px-2 py-1.5 rounded-lg text-xs hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Теги */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 transition-colors">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 transition-colors">Теги</h3>

            {/* Выбранные теги */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-indigo-900/30 text-teal-600 dark:text-teal-400 transition-colors"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-500 dark:hover:text-red-400 transition"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Ввод нового тега */}
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Добавить тег..."
              className="w-full text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 transition-colors">Enter или запятая для добавления</p>

            {/* Существующие теги */}
            {allTags && allTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1 transition-colors">Существующие:</p>
                <div className="flex flex-wrap gap-1">
                  {allTags
                    .filter(t => !tags.includes(t.name))
                    .map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => addTag(tag.name)}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-teal-900/30 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                      >
                        #{tag.name}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
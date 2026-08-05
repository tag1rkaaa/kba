import { api } from './client'

export interface Category {
  id: number
  name: string
  slug: string
  children: Category[]
}

export const sourcesApi = {
  list: () => api.get<string[]>('/import/sources').then(r => r.data),

  importJson: (file: File, categoryId?: number | null) => {
    const form = new FormData()
    form.append('file', file)
    if (categoryId) form.append('category_id', String(categoryId))
    return api.post('/import/json', form).then(r => r.data)
  },

  importCsv: (file: File, categoryId?: number | null) => {
    const form = new FormData()
    form.append('file', file)
    if (categoryId) form.append('category_id', String(categoryId))
    return api.post('/import/csv', form).then(r => r.data)
  },

  categories: () => api.get<Category[]>('/categories/').then(r => r.data),

  createCategory: (name: string) =>
    api.post<Category>('/categories/', { name, parent_id: null, sort_order: 0 }).then(r => r.data),
}
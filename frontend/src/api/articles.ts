import { api } from './client'

export interface Article {
  id:          number
  number?:     number
  title:       string
  slug:        string
  status:      string
  version:     number
  category_id: number | null
  author_id:   number
  source?:     string
  created_at:  string
  updated_at:  string
}

export interface ArticleDetail extends Article {
  content: object
  tags: { id: number; name: string; slug: string }[]
}

export interface ArticleCreate {
  title: string
  content: object
  status: string
  category_id?: number | null
  tags?: string[]
}

export const articlesApi = {
  list: (skip = 0, limit = 20, source?: string) =>
    api.get<Article[]>('/articles/', { params: { skip, limit, source } }).then(r => r.data),

  get: (id: number) =>
    api.get<ArticleDetail>(`/articles/${id}`).then(r => r.data),

  create: (data: ArticleCreate) =>
    api.post<Article>('/articles/', data).then(r => r.data),

  update: (id: number, data: Partial<ArticleCreate>) =>
    api.patch<Article>(`/articles/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/articles/${id}`),
}

export interface ArticleDetail extends Article {
  content: object
  description?: string
  tags: { id: number; name: string; slug: string }[]
}
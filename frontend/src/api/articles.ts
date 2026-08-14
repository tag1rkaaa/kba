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
  // Добавляем недостающие поля, чтобы TS их видел:
  description?: string
  content_plain?: string
  tags?: { id: number; name: string; slug: string }[]
}

export interface ArticleDetail extends Article {
  content: object
}

export interface ArticleCreate {
  title: string
  content: object
  status: string
  category_id?: number | null
  tags?: string[]
}

export const articlesApi = {
  list: (params?: { page?: number; source?: string }) => {
    const limit = 20
    const skip = params?.page ? (params.page - 1) * limit : 0
    
    const queryParams: Record<string, any> = { skip, limit }
    
    if (params?.source) {
      queryParams.source = params.source
    }

    return api.get<Article[]>('/articles/', { params: queryParams }).then(r => r.data)
  },

  get: (id: number) =>
    api.get<ArticleDetail>(`/articles/${id}`).then(r => r.data),

  create: (data: ArticleCreate) =>
    api.post<Article>('/articles/', data).then(r => r.data),

  update: (id: number, data: Partial<ArticleCreate>) =>
    api.patch<Article>(`/articles/${id}`, data).then(r => r.data),

  delete: (id: number) =>
    api.delete(`/articles/${id}`),

  sendFeedback: (articleId: number, message: string) =>
    api.post(`/articles/${articleId}/feedback`, { message }).then(r => r.data),

  getFeedback: (status: string = 'new') => 
    api.get('/articles/feedback/list', { params: { status } }).then(r => r.data),
    
  resolveFeedback: (id: number) => 
    api.patch(`/articles/feedback/${id}/resolve`).then(r => r.data),

  getRevisions: (id: number) => 
    api.get(`/articles/${id}/revisions`).then(r => r.data),

  restoreRevision: (articleId: number, revisionId: number) => 
    api.post(`/articles/${articleId}/restore/${revisionId}`).then(r => r.data),
}


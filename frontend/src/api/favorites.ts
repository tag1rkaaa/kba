import { api } from './client'
import type { Article } from './articles'

export const favoritesApi = {
  list: () =>
    api.get<Article[]>('/favorites/').then(r => r.data),

  add: (articleId: number) =>
    api.post(`/favorites/${articleId}`).then(r => r.data),

  remove: (articleId: number) =>
    api.delete(`/favorites/${articleId}`),

  status: (articleId: number) =>
    api.get<{ is_favorite: boolean }>(`/favorites/${articleId}/status`).then(r => r.data),
}
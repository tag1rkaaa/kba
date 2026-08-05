import { api } from './client'

export interface SearchHit {
  id: number
  title: string
  slug: string
  excerpt: string
  score: number
  author_id: number
  created_at: string
}

export interface SearchResponse {
  hits: SearchHit[]
  total_count: number
  time_ms: number
  search_mode: string
}

export const searchApi = {
  search: (q: string, params?: { category_id?: number; tags?: string }) =>
    api.get<SearchResponse>('/search/', { params: { q, ...params } }).then(r => r.data),
}
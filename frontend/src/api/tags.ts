import { api } from './client'

export interface Tag {
  id: number
  name: string
  slug: string
}

export const tagsApi = {
  list: () => api.get<Tag[]>('/tags/').then(r => r.data),
}
import { api } from './client'

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),

  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }).then(r => r.data),

  me: () =>
    api.get('/users/me').then(r => r.data),
}
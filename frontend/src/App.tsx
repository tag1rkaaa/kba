import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import ArticlesPage    from './pages/ArticlesPage'
import ArticleViewPage from './pages/ArticleViewPage'
import EditorPage      from './pages/EditorPage'
import AdminPage       from './pages/AdminPage'
import ImportPage      from './pages/ImportPage'
import SearchPage      from './pages/SearchPage'

const queryClient = new QueryClient()

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token')
  return token ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<PrivateRoute><ArticlesPage /></PrivateRoute>} />
          <Route path="/search"   element={<PrivateRoute><SearchPage /></PrivateRoute>} />
          <Route path="/articles/new"       element={<PrivateRoute><EditorPage /></PrivateRoute>} />
          <Route path="/articles/:id"       element={<PrivateRoute><ArticleViewPage /></PrivateRoute>} />
          <Route path="/articles/:id/edit"  element={<PrivateRoute><EditorPage /></PrivateRoute>} />
          <Route path="/admin"  element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="/import" element={<PrivateRoute><ImportPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
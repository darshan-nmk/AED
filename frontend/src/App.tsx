import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PipelinesPage from './pages/PipelinesPage';
import EditorPage from './pages/EditorPage';
import RunsPage from './pages/RunsPage';
import AllRunsPage from './pages/AllRunsPage';
import RunDetailPage from './pages/RunDetailPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import AppLayout from './components/layout/AppLayout';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { authAPI } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        await authAPI.getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <AppLayout>
                  <Routes>
                    <Route path="/pipelines" element={<PipelinesPage />} />
                    <Route path="/pipelines/:id/editor" element={<EditorPage />} />
                    <Route path="/pipelines/:id/runs" element={<RunsPage />} />
                    <Route path="/runs/:id" element={<RunDetailPage />} />
                    <Route path="/runs" element={<AllRunsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/" element={<Navigate to="/pipelines" replace />} />
                  </Routes>
                </AppLayout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

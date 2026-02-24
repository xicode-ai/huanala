import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGlobalErrorListener } from './hooks/useGlobalErrorListener';
import { LoginOneClick } from './pages/LoginOneClick';
import { Home } from './pages/Home';
import { Chat } from './pages/Chat';
import { ProfileSettings } from './pages/ProfileSettings';
import { SystemSettings } from './pages/SystemSettings';
import { useUserStore } from './stores';
import { setAuthProvider } from './services/auth/types';
import { SupabaseAuthProvider } from './services/auth/supabaseAuthProvider';

// 注册全局 AuthProvider（应用启动时执行一次）
setAuthProvider(new SupabaseAuthProvider());

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen w-full flex items-center justify-center text-slate-600 text-sm">Loading...</div>
);

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const isInitializing = useUserStore((s) => s.isInitializing);

  if (isInitializing) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

const GuestRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const isInitializing = useUserStore((s) => s.isInitializing);

  if (isInitializing) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return children;
};

const App: React.FC = () => {
  const initAuth = useUserStore((s) => s.initAuth);

  // 注册全局未捕获异常监听
  useGlobalErrorListener();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initAuth().then((unsub) => {
      cleanup = unsub;
    });
    return () => {
      cleanup?.();
    };
  }, [initAuth]);

  return (
    <HashRouter>
      <ToastContainer />
      <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <GuestRoute>
                <LoginOneClick />
              </GuestRoute>
            }
          />
          <Route path="/login-verify" element={<Navigate to="/" replace />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SystemSettings />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </HashRouter>
  );
};

export default App;

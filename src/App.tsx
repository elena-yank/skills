import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SkillDetail } from './pages/SkillDetail';
import { PublicProfile } from './pages/PublicProfile';
import { WizardList } from './pages/WizardList';
import { DatabaseAdmin } from './pages/DatabaseAdmin';
import { StoriesList } from './pages/StoriesList';
import { StoryDetail } from './pages/StoryDetail';
import { useStore } from './store';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, refreshUser } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    const run = () => {
      if (document.visibilityState === 'hidden') return;
      refreshUser();
    };

    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);

    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [user?.id, refreshUser]);

  useEffect(() => {
    if (!user) return;
    if (document.visibilityState === 'hidden') return;
    refreshUser();
  }, [user?.id, refreshUser, location.pathname]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/u/:username" element={<PublicProfile />} />
      <Route path="/u/:username/skill/:skillName" element={<SkillDetail />} />
      <Route path="/u/:username/stories" element={<StoriesList />} />
      <Route path="/stories/:id" element={<StoryDetail />} />
      <Route path="/wizards" element={<WizardList />} />
      <Route
        path="/admin/db/edit"
        element={
          <ProtectedRoute>
            <DatabaseAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-stories"
        element={
          <ProtectedRoute>
            <StoriesList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/skill/:skillName"
        element={
          <ProtectedRoute>
            <SkillDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SkillDetail } from './pages/SkillDetail';
import { PublicProfile } from './pages/PublicProfile';
import { WizardList } from './pages/WizardList';
import { DatabaseAdmin } from './pages/DatabaseAdmin';
import { useStore } from './store';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/u/:username/skill/:skillName" element={<SkillDetail />} />
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
          path="/skill/:skillName"
          element={
            <ProtectedRoute>
              <SkillDetail />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Home from './pages/Home';
import SoftwareList from './pages/SoftwareList';
import SoftwareDetail from './pages/SoftwareDetail';
import ApplicationForm from './pages/ApplicationForm';
import ApprovalCenter from './pages/ApprovalCenter';
import QueueDetail from './pages/QueueDetail';
import MyLicenses from './pages/MyLicenses';
import SoftwareManagement from './pages/SoftwareManagement';
import UserManagement from './pages/UserManagement';
import StatisticsReport from './pages/StatisticsReport';
import type { UserRole } from '../shared/types';

function AppContent() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Home />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/software"
        element={
          <ProtectedRoute>
            <Layout>
              <SoftwareList />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/software/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <SoftwareDetail />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/apply/:softwareId"
        element={
          <ProtectedRoute>
            <Layout>
              <ApplicationForm />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/approval"
        element={
          <ProtectedRoute allowedRoles={['teacher', 'admin'] as UserRole[]}>
            <Layout>
              <ApprovalCenter />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/queue/:softwareId"
        element={
          <ProtectedRoute>
            <Layout>
              <QueueDetail />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/queue"
        element={
          <ProtectedRoute>
            <Navigate to="/software" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/licenses"
        element={
          <ProtectedRoute>
            <Layout>
              <MyLicenses />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/software"
        element={
          <ProtectedRoute allowedRoles={['admin'] as UserRole[]}>
            <Layout>
              <SoftwareManagement />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin'] as UserRole[]}>
            <Layout>
              <UserManagement />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/statistics"
        element={
          <ProtectedRoute allowedRoles={['admin'] as UserRole[]}>
            <Layout>
              <StatisticsReport />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Navbar from './components/Navbar';
import AdminSidebar from './components/AdminSidebar';
import SuperAdminSidebar from './components/SuperAdminSidebar';

// Public Pages
import Login from './pages/Login';
import SignupWizard from './pages/SignupWizard';

// Admin Pages (Reorganized folder)
import AdminDashboard from './pages/admin/AdminDashboard';
import LiveQueue from './pages/admin/LiveQueue';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';

// Super Admin Pages (Reorganized folder)
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import SuperAdminUsers from './pages/superadmin/SuperAdminUsers';
import SuperAdminBusinesses from './pages/superadmin/SuperAdminBusinesses';
import SuperAdminBusinessDetail from './pages/superadmin/SuperAdminBusinessDetail';
import SuperAdminRingtones from './pages/superadmin/SuperAdminRingtones';
import SuperAdminAds from './pages/superadmin/SuperAdminAds';
import SuperAdminReports from './pages/superadmin/SuperAdminReports';
import SuperAdminSettings from './pages/superadmin/SuperAdminSettings';
import SuperAdminTrending from './pages/superadmin/SuperAdminTrending';
import SuperAdminLiveMobile from './pages/superadmin/SuperAdminLiveMobile';

// Protector for authenticated routes with role verification (RBAC)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const [mobileSidebar, setMobileSidebar] = useState(false);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'superadmin' ? '/superadmin/dashboard' : '/admin/dashboard'} replace />;
  }

  // --- ADMIN SIDEBAR LAYOUT ---
  if (user.role === 'admin') {
    return (
      <div className="min-vh-100 bg-light">
        <header className="mobile-admin-header">
          <div className="d-flex align-items-center">
            <button className="btn btn-light me-2 border shadow-sm" onClick={() => setMobileSidebar(!mobileSidebar)}>
              <i className="bi bi-list fs-4"></i>
            </button>
            <span className="fw-extrabold text-dark font-outfit fs-4">
              Whistlez<span className="text-primary">.</span>
            </span>
          </div>
          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '38px', height: '38px' }}>
            {user.name.substring(0, 1).toUpperCase()}
          </div>
        </header>

        {mobileSidebar && (
          <div 
            className="details-drawer-overlay show" 
            style={{ display: 'block', zIndex: 998 }} 
            onClick={() => setMobileSidebar(false)}
          ></div>
        )}

        <AdminSidebar showMobile={mobileSidebar} toggleMobile={setMobileSidebar} />

        <main className="admin-content-layout" style={{ transition: 'all 0.3s ease' }}>
          <style>{`
            @media (min-width: 992px) {
              .admin-content-layout {
                padding-left: 250px;
              }
            }
          `}</style>
          <div className="p-3 p-md-4">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // --- SUPER ADMIN SIDEBAR LAYOUT ---
  if (user.role === 'superadmin') {
    return (
      <div className="min-vh-100 bg-light">
        <header className="mobile-admin-header">
          <div className="d-flex align-items-center">
            <button className="btn btn-light me-2 border shadow-sm" onClick={() => setMobileSidebar(!mobileSidebar)}>
              <i className="bi bi-list fs-4"></i>
            </button>
            <span className="fw-extrabold text-dark font-outfit fs-4">
              Whistlez<span className="text-primary">.</span>
            </span>
          </div>
          <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '38px', height: '38px' }}>
            {user.name.substring(0, 1).toUpperCase()}
          </div>
        </header>

        {mobileSidebar && (
          <div 
            className="details-drawer-overlay show" 
            style={{ display: 'block', zIndex: 998 }} 
            onClick={() => setMobileSidebar(false)}
          ></div>
        )}

        <SuperAdminSidebar showMobile={mobileSidebar} toggleMobile={setMobileSidebar} />

        <main className="admin-content-layout" style={{ transition: 'all 0.3s ease' }}>
          <style>{`
            @media (min-width: 992px) {
              .admin-content-layout {
                padding-left: 250px;
              }
            }
          `}</style>
          <div className="p-3 p-md-4">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return children;
};

// Redirects logged-in users away from auth pages
const PublicRoute = ({ children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Navigate to={user.role === 'superadmin' ? '/superadmin/dashboard' : '/admin/dashboard'} replace />;
  }

  return children;
};

// Root index redirect route helper
const RootRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) return null;
  
  if (isAuthenticated) {
    return <Navigate to={user.role === 'superadmin' ? '/superadmin/dashboard' : '/admin/dashboard'} replace />;
  }
  
  return <Navigate to="/login" replace />;
};

// Scroll restorer component on route change transitions
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public Auth Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupWizard />
              </PublicRoute>
            }
          />

          {/* Admin Protected Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/live-queue"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LiveQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Protected Routes */}
          <Route
            path="/superadmin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/users"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/businesses"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminBusinesses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/businesses/:id"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminBusinessDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/ringtones"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminRingtones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/ads"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminAds />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/reports"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/settings"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/trending"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminTrending />
              </ProtectedRoute>
            }
          />
          <Route
            path="/superadmin/live-mobile"
            element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminLiveMobile />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect handler */}
          <Route path="/" element={<RootRedirect />} />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

/**
 * Composes public routes, authenticated routes, session state, and responsive navigation for Heimdall screening.
 * Defers page bundles until navigation requests them and preserves the attempted path for unauthenticated users.
 */

import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import AuthProvider from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import './index.css';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Progression = lazy(() => import('./pages/Progression'));
const History = lazy(() => import('./pages/History'));
const PatientHistory = lazy(() => import('./pages/PatientHistory'));
const Patients = lazy(() => import('./pages/Patients'));


/** Renders the route-level suspense placeholder while a page bundle loads. */
function LoadingPage() {
  return <div className="page-content"><div className="space-y-5" aria-label="Loading page"><div className="h-7 w-48 skeleton" /><div className="h-32 skeleton" /></div></div>;
}

/** Renders the authenticated application shell and redirects anonymous users to sign-in. */
function ProtectedLayout() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!ready) return <LoadingPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <div className={`app-shell flex min-h-screen ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onToggleCollapse={() => setCollapsed(value => !value)} onCloseMobile={() => setMobileOpen(false)} />
    <main className={`page-content flex-1 ${location.pathname.startsWith('/analysis') ? 'analysis-layout' : ''}`}>
      <div className="mobile-header">
        <button className="nav-toggle" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={19} /></button>
        <div><p className="text-[14px] font-bold text-white">TB<span className="text-gradient"> Detect</span></p><p className="text-[11px] text-slate-500">AI-assisted screening</p></div>
      </div>
      <Suspense fallback={<div className="space-y-5" aria-label="Loading page"><div className="h-7 w-48 skeleton" /><div className="h-32 skeleton" /></div>}><Outlet /></Suspense>
    </main>
  </div>;
}

/** Maps public and authenticated URLs to lazily loaded screening interface pages. */
function AppRoutes() {
  
  return <Suspense fallback={<LoadingPage />}><Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route element={<ProtectedLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis" element={<Analysis />} />
      <Route path="/analysis/:patientId" element={<Analysis />} />
      <Route path="/patients/:patientId/history" element={<PatientHistory />} />
      <Route path="/progression/:patientId" element={<Progression />} />
      <Route path="/history" element={<History />} />
      <Route path="/patients" element={<Patients />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>;
}

/** Mounts router, session provider, toast surface, and application routes. */
function App() {
  return <BrowserRouter><AuthProvider>
    <Toaster position="top-right" toastOptions={{
      duration: 4000,
      style: { background: '#fff', color: '#203447', borderRadius: '14px', fontSize: '14px', border: '1px solid #dfEaf0', boxShadow: '0 8px 28px rgba(21,50,75,.12)', padding: '14px 18px' },
      success: { iconTheme: { primary: '#16a895', secondary: '#fff' } },
      error: { iconTheme: { primary: '#d64e62', secondary: '#fff' } },
    }} />
    <AppRoutes />
  </AuthProvider></BrowserRouter>;
}

export default App;

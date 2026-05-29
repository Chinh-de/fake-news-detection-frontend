import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Cpu, History, Settings, LogOut, LogIn, Menu, X } from 'lucide-react';
import Guest from './pages/Guest';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HistoryList from './pages/History';
import HistoryDetail from './pages/HistoryDetail';
import Config from './pages/Config';

// Protected Route Wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Navigation Header
function Header({ token, onLogout }: { token: string | null; onLogout: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border-color bg-white/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 text-text-primary text-lg font-extrabold hover:opacity-90">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <Shield size={20} />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Fake News Detection System
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-semibold transition-all ${
                isActive('/') ? 'text-blue-600' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Trang Chủ
            </Link>

            {token ? (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`text-sm font-semibold flex items-center gap-1.5 transition-all ${
                    isActive('/admin/dashboard') ? 'text-blue-600' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Cpu size={14} /> Thống Kê
                </Link>
                <Link
                  to="/admin/history"
                  className={`text-sm font-semibold flex items-center gap-1.5 transition-all ${
                    isActive('/admin/history') || location.pathname.startsWith('/admin/history/')
                      ? 'text-blue-600'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <History size={14} /> Lịch Sử
                </Link>
                <Link
                  to="/admin/config"
                  className={`text-sm font-semibold flex items-center gap-1.5 transition-all ${
                    isActive('/admin/config') ? 'text-blue-600' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Settings size={14} /> Cấu Hình
                </Link>
                <button
                  onClick={() => {
                    onLogout();
                    navigate('/');
                  }}
                  className="btn btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
                >
                  <LogOut size={12} /> Đăng xuất
                </button>
              </>
            ) : (
              <Link
                to="/admin/login"
                className="btn btn-secondary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5"
              >
                <LogIn size={12} /> Đăng Nhập Admin
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-text-secondary hover:text-text-primary focus:outline-none p-1.5 rounded-lg border border-border-color"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border-color bg-white/95 backdrop-blur-sm px-4 pt-2 pb-4 space-y-3 animate-slide-in">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className={`block py-2 text-sm font-semibold ${
              isActive('/') ? 'text-blue-600' : 'text-text-secondary'
            }`}
          >
            Trang Chủ
          </Link>

          {token ? (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className={`py-2 text-sm font-semibold flex items-center gap-2 ${
                  isActive('/admin/dashboard') ? 'text-blue-600' : 'text-text-secondary'
                }`}
              >
                <Cpu size={14} /> Thống Kê
              </Link>
              <Link
                to="/admin/history"
                onClick={() => setIsOpen(false)}
                className={`py-2 text-sm font-semibold flex items-center gap-2 ${
                  isActive('/admin/history') || location.pathname.startsWith('/admin/history/')
                    ? 'text-blue-600'
                    : 'text-text-secondary'
                }`}
              >
                <History size={14} /> Lịch Sử
              </Link>
              <Link
                to="/admin/config"
                onClick={() => setIsOpen(false)}
                className={`py-2 text-sm font-semibold flex items-center gap-2 ${
                  isActive('/admin/config') ? 'text-blue-600' : 'text-text-secondary'
                }`}
              >
                <Settings size={14} /> Cấu Hình
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                  navigate('/');
                }}
                className="btn btn-secondary w-full py-2 text-xs font-bold flex justify-center items-center gap-1.5"
              >
                <LogOut size={12} /> Đăng xuất
              </button>
            </>
          ) : (
            <Link
              to="/admin/login"
              onClick={() => setIsOpen(false)}
              className="btn btn-secondary w-full py-2 text-xs font-bold flex justify-center items-center gap-1.5"
            >
              <LogIn size={12} /> Đăng Nhập Admin
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));

  const handleLogin = (newToken: string) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        <Header token={token} onLogout={handleLogout} />
        
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <Routes>
            <Route path="/" element={<Guest />} />
            <Route path="/admin/login" element={<Login onLogin={handleLogin} />} />
            
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/history"
              element={
                <ProtectedRoute>
                  <HistoryList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/history/:id"
              element={
                <ProtectedRoute>
                  <HistoryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/config"
              element={
                <ProtectedRoute>
                  <Config />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-border-color py-6 text-center text-xs text-text-muted mt-auto bg-slate-50/95">
          <p>© 2026 Fake News Detection System. Tất cả các quyền được bảo lưu.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

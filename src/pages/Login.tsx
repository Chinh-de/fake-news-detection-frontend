import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, Shield } from 'lucide-react';

interface LoginProps {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Tên đăng nhập hoặc mật khẩu không đúng');
      }

      const data = await response.json();
      onLogin(data.access_token);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-shell-narrow flex-1 flex items-center justify-center">
      <div className="w-full glass-panel p-7 md:p-8 section-stack animate-slide-in">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 mb-3">
            <Shield size={30} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Hệ Thống Quản Trị</h2>
          <p className="text-sm text-text-secondary">Đăng nhập tài khoản Admin để quản lý hệ thống</p>
        </div>

        {error && (
          <div className="p-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <User size={12} /> Tên đăng nhập
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập admin"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
              <Lock size={12} /> Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full py-3 mt-2 flex justify-center items-center"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

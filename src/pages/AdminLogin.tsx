import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Coffee } from 'lucide-react';
import { DEFAULT_BRAND_SETTINGS } from '../lib/utils';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cafeName, setCafeName] = useState(DEFAULT_BRAND_SETTINGS.cafe_name);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.cafe_name) setCafeName(data.cafe_name);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('admin_token', data.token);
        toast.success('ورود موفقیت‌آمیز');
        navigate('/admin/dashboard');
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('خطای شبکه. لطفا مجدد تلاش کنید.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Coffee size={32} />
          </div>
        </div>
        <h2 className="text-xl font-bold text-center mb-2 text-gray-800">پنل مدیریت منوی دیجیتال</h2>
        <p className="text-xs text-center text-gray-500 mb-8">{cafeName}</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نام کاربری</label>
            <input 
              type="text" 
              autoComplete="username"
              placeholder="admin"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رمز عبور</label>
            <input 
              type="password" 
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors mt-4 shadow-lg shadow-primary/20"
          >
            ورود به پنل
          </button>
        </form>
      </div>
    </div>
  );
}

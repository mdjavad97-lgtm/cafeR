import { useState, useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Home, Grid, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_BRAND_SETTINGS } from '../lib/utils';

export default function AdminLayout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cafeName, setCafeName] = useState(DEFAULT_BRAND_SETTINGS.cafe_name);

  useEffect(() => {
    const loadBrand = () => {
      fetch(`${import.meta.env.BASE_URL}api/settings`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.cafe_name) setCafeName(data.cafe_name);
        })
        .catch(() => {});
    };
    loadBrand();
    window.addEventListener('brand-settings-updated', loadBrand);
    return () => window.removeEventListener('brand-settings-updated', loadBrand);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.BASE_URL}api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem('admin_token');
          navigate('/log', { replace: true });
        }
      })
      .catch(() => {});
  }, [token, navigate]);

  if (!token) return <Navigate to="/log" replace />;

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/log');
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-gray-100 flex justify-between items-center md:block relative">
        <div className="text-right w-full md:w-auto md:text-center">
          <h2 className="font-bold text-base md:text-lg text-primary hidden md:block truncate">
            {cafeName}
          </h2>
          <p className="text-[11px] text-gray-400 hidden md:block mt-0.5">پنل مدیریت منوی دیجیتال</p>
          <h1 className="font-bold text-primary text-xs md:hidden text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-max">
            {cafeName}
          </h1>
        </div>
        <button className="md:hidden text-gray-500 z-10" onClick={() => setMobileMenuOpen(false)}>
          <X size={24} />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <a href="#" className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-xl font-medium" onClick={() => setMobileMenuOpen(false)}>
          <Grid size={20} />
          مدیریت منو و برند
        </a>
        <div className="mx-4 my-6 border-t border-gray-100"></div>
        <button onClick={() => navigate('/')} className="flex w-full items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer">
          <Home size={20} />
          مشاهده منوی کافه
        </button>
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
          <LogOut size={20} />
          خروج از سیستم
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-200 hidden md:flex flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.aside 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-64 bg-white h-full flex flex-col absolute right-0 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <SidebarContent />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 max-w-full overflow-hidden flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
          <h2 className="font-bold text-lg text-primary">پنل مدیریت محصولات</h2>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-600 bg-gray-100 rounded-lg">
            <Menu size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1"
          >
            <Outlet />
          </motion.div>
          
          <footer className="text-center py-4 text-xs text-gray-400 mt-8 border-t border-gray-200">
            <p>طراحی و توسعه توسط Hami</p>
          </footer>
        </div>
      </main>
    </div>
  );
}

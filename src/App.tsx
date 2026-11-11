import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import Home from './pages/Home';
import ProductDetails from './pages/ProductDetails';
import PitchPage from './pages/PitchPage';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './pages/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Toaster position="top-center" dir="rtl" />
      <Routes>
        {/* Public Menu App */}
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/pitch" element={<PitchPage />} />

        {/* Admin Dashboard */}
        <Route path="/log" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

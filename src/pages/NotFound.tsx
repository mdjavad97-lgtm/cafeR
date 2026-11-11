import React from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { motion } from 'motion/react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-9xl font-black text-gray-200">۴۰۴</h1>
        <h2 className="text-3xl font-bold text-gray-800 mt-4 mb-2">صفحه مورد نظر یافت نشد</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span>بازگشت به خانه</span>
        </Link>
      </motion.div>
    </div>
  );
}

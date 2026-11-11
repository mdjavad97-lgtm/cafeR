import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, ZoomIn, Star } from 'lucide-react';
import { formatPriceNumber, GENERATED_IMAGES, resolveProductImage } from '../lib/utils';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) return null;

  if (!product || product.error || product.is_available === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 bg-bg-base font-sans" dir="rtl">
        <p className="text-text-muted mb-4 text-sm">
          {product?.is_available === 0
            ? 'این محصول در حال حاضر موجود نیست'
            : 'محصول مورد نظر یافت نشد'}
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-3 rounded-xl text-xs font-bold hover:opacity-95 transition-all cursor-pointer"
        >
          بازگشت به منوی کافه
        </button>
      </div>
    );
  }

  const resolvedImg = resolveProductImage(product.image_url, product.name, product.category_id);

  return (
    <div className="bg-bg-base min-h-screen font-sans text-text-main pb-16" dir="rtl">
      <button
        onClick={() => navigate(-1)}
        aria-label="بازگشت"
        className="fixed top-6 right-6 z-50 bg-black/50 backdrop-blur-md w-11 h-11 flex items-center justify-center rounded-full cursor-pointer shadow-sm border border-white/20 text-white hover:bg-black/70 transition-all"
      >
        <ArrowRight size={20} />
      </button>

      {resolvedImg ? (
        <div
          className="w-full h-[45vh] md:h-[58vh] bg-bg-subtle flex items-center justify-center relative overflow-hidden border-b border-border-subtle cursor-pointer group"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={resolvedImg}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          <div className="absolute bottom-6 left-6 bg-black/55 backdrop-blur-md text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-white/15">
            <ZoomIn size={14} />
            <span>بزرگنمایی تصویر</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-32 bg-bg-subtle border-b border-border-subtle" />
      )}

      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="max-w-3xl mx-auto px-6 md:px-10 py-8 md:-mt-16 bg-bg-surface relative z-10 rounded-t-3xl md:rounded-3xl shadow-sm border border-border-subtle"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            {product.is_special === 1 ? (
              <span className="bg-[#9E4733] text-white text-[11px] font-bold px-3 py-1 rounded-full">
                پیشنهاد سرآشپز
              </span>
            ) : (
              <span className="text-xs text-text-muted">تهیه روزانه</span>
            )}
            <div className="flex items-center gap-1 text-amber-600 text-xs font-bold">
              <span className="tabular-nums">۴.۹</span>
              <Star size={14} className="fill-amber-500 text-amber-500" />
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-main">
            {product.name}
          </h1>
        </div>

        <div className="space-y-2 mb-6">
          <p className="text-text-muted leading-relaxed text-sm md:text-base">
            {product.description || 'تهیه شده با مواد اولیه تازه و دستورالعمل اختصاصی سرآشپز مجموعه.'}
          </p>
        </div>

        <div className="pt-5 border-t border-border-subtle flex items-end justify-between gap-4">
          <div className="flex flex-col items-start text-right">
            <span className="text-xs text-text-muted leading-none mb-1.5">
              قیمت سفارش
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl md:text-3xl font-extrabold text-text-main tabular-nums tracking-tight">
                {formatPriceNumber(product.price)}
              </span>
              <span className="text-sm font-medium text-text-muted">
                تومان
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#2C1810] dark:bg-primary text-white font-bold text-xs sm:text-sm rounded-full hover:opacity-95 transition-colors cursor-pointer"
          >
            بازگشت به منو
          </button>
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="absolute top-6 right-6 w-11 h-11 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <X size={22} />
            </div>
            <motion.img
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={resolvedImg}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

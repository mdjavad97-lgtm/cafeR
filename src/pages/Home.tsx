import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee,
  Loader2,
  Moon,
  Sun,
  Search,
  X,
  LayoutGrid,
  List,
  QrCode,
  Star,
  Sparkles,
  UtensilsCrossed,
  ChevronLeft,
} from 'lucide-react';
import {
  cn,
  formatPriceNumber,
  GENERATED_IMAGES,
  resolveProductImage,
  BrandSettings,
  DEFAULT_BRAND_SETTINGS,
} from '../lib/utils';
import { useNavigate } from 'react-router-dom';

type Category = { id: number; name: string; sort_order: number };
type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: number;
  is_special: number;
};

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('۴');

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    const stored = localStorage.getItem('viewMode');
    return stored === 'list' || stored === 'grid' ? stored : 'list';
  });

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}api/categories`).then((r) => r.json()),
      fetch(`${import.meta.env.BASE_URL}api/products`).then((r) => r.json()),
      fetch(`${import.meta.env.BASE_URL}api/settings`)
        .then((r) => r.json())
        .catch(() => DEFAULT_BRAND_SETTINGS),
    ]).then(([cats, prods, settingsData]) => {
      setCategories(cats);
      setProducts(prods);
      if (settingsData && settingsData.cafe_name) {
        setBrand({ ...DEFAULT_BRAND_SETTINGS, ...settingsData });
        const root = window.document.documentElement;
        const theme = settingsData.brand_theme || 'espresso';
        if (theme === 'botanical') {
          root.removeAttribute('data-brand');
        } else {
          root.setAttribute('data-brand', theme);
        }
        document.title = `${settingsData.cafe_name} | منوی دیجیتال`;
      }
      setLoading(false);
    });
  }, []);

  const availableProducts = products.filter((p) => p.is_available !== 0);

  // Featured Barista Spotlight Item
  const spotlightProduct =
    availableProducts.find((p) => p.is_special === 1) || availableProducts[0];

  const filteredProducts = availableProducts.filter((p) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }
    if (activeTab === 'all') return true;
    if (activeTab === -1) return p.is_special === 1;
    return p.category_id === activeTab;
  });

  const resolveImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('/uploads/')) return url;
    return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const logoSrc = resolveImageUrl(brand.logo_url);

  // Render a single horizontal List Card (Clean, contained, no stepper)
  const renderHorizontalCard = (product: Product) => {
    const imgSrc = resolveProductImage(product.image_url, product.name, product.category_id);

    return (
      <div
        key={`horiz-${product.id}`}
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-bg-surface border border-border-subtle rounded-3xl p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4 cursor-pointer group hover:shadow-md hover:border-primary/35 transition-all overflow-hidden"
      >
        {/* Right Side (in RTL): Circular / Rounded Image */}
        <div className="relative w-22 h-22 sm:w-26 sm:h-26 shrink-0">
          <img
            src={imgSrc}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = GENERATED_IMAGES.floralLatte;
            }}
            className="w-full h-full rounded-full object-cover border-2 border-border-subtle group-hover:scale-105 transition-transform duration-500 shadow-2xs"
          />
          {product.is_special === 1 && (
            <span className="absolute top-0 right-0 bg-[#3A2218] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              ویژه
            </span>
          )}
        </div>

        {/* Left Side (in RTL): Title, Description, and Dedicated Bottom Price Row */}
        <div className="flex flex-col flex-1 min-w-0 text-right justify-between">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-text-main truncate">
              {product.name}
            </h3>
            <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mt-1 mb-2.5">
              {product.description || 'تهیه شده با مواد اولیه تازه و دستورالعمل اختصاصی'}
            </p>
          </div>

          {/* Dedicated Bottom Price Row inside the card */}
          <div className="flex items-baseline justify-between gap-2 pt-2 border-t border-border-subtle/60 mt-auto">
            <span className="text-[11px] text-text-muted">قیمت</span>
            <div className="flex items-baseline gap-1 shrink-0">
              <span className="text-base sm:text-lg font-extrabold text-text-main tabular-nums tracking-tight">
                {formatPriceNumber(product.price)}
              </span>
              <span className="text-[11px] font-medium text-text-muted">
                تومان
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a Featured Showcase Card (Clean, contained, no stepper)
  const renderShowcaseCard = (product: Product) => {
    const imgSrc = resolveProductImage(product.image_url, product.name, product.category_id);

    return (
      <div
        key={`showcase-${product.id}`}
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-bg-surface border border-border-subtle rounded-3xl p-4 sm:p-5 flex flex-col justify-between cursor-pointer group hover:shadow-md hover:border-primary/35 transition-all overflow-hidden"
      >
        <div>
          {/* Large Top Rounded Image */}
          <div className="w-full aspect-[16/10] rounded-2xl overflow-hidden relative bg-bg-subtle mb-3.5 border border-border-subtle/60">
            <img
              src={imgSrc}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = GENERATED_IMAGES.floralLatte;
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {product.is_special === 1 && (
              <div className="absolute top-3 right-3">
                <span className="bg-[#9E4733] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                  پیشنهاد شف
                </span>
              </div>
            )}
          </div>

          {/* Title + Rating Row */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h3 className="font-extrabold text-base sm:text-lg text-text-main truncate">
              {product.name}
            </h3>
            <div className="flex items-center gap-1 text-amber-600 text-xs font-bold shrink-0">
              <span className="tabular-nums">۴.۹</span>
              <Star size={13} className="fill-amber-500 text-amber-500" />
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-2 mb-4">
            {product.description || 'تهیه شده با مواد اولیه تازه و دستورالعمل اختصاصی سرآشپز'}
          </p>
        </div>

        {/* Dedicated Bottom Price Row inside the card */}
        <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-border-subtle/70 mt-auto">
          <span className="text-xs text-text-muted">قیمت سفارش</span>
          <div className="flex items-baseline gap-1 shrink-0">
            <span className="text-lg sm:text-xl font-extrabold text-text-main tabular-nums tracking-tight">
              {formatPriceNumber(product.price)}
            </span>
            <span className="text-xs font-medium text-text-muted">
              تومان
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-16 relative bg-bg-base text-text-main font-sans" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {/* Top Cafe Brand Header */}
        <header className="flex items-center justify-between gap-3 mb-5">
          {/* Right side: Logo + Cafe Name + Hours */}
          <div className="flex items-center gap-3 min-w-0">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brand.cafe_name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border border-border-subtle bg-bg-surface shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#2C1810] dark:bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                <Coffee size={22} />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-text-main truncate">
                  {brand.cafe_name}
                </h1>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                {brand.working_hours && (
                  <span className="truncate">{brand.working_hours}</span>
                )}
                {brand.working_hours && brand.wifi_info && (
                  <span aria-hidden="true">·</span>
                )}
                {brand.wifi_info && (
                  <span className="truncate hidden sm:inline">{brand.wifi_info}</span>
                )}
              </div>
            </div>
          </div>

          {/* Left side: Action Circle Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setQrModalOpen(true)}
              title="QR کد میز"
              className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center text-text-main hover:border-primary transition-colors cursor-pointer"
            >
              <QrCode size={18} />
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              title="حالت روز و شب"
              className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center text-text-main hover:border-primary transition-colors cursor-pointer"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Search Input Bar + View Switcher */}
        <div className="relative mb-6 flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="جستجوی طعم دلخواه، قهوه، صبحانه، سالاد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-surface border border-border-subtle rounded-full py-3.5 pr-11 pl-10 text-xs sm:text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-bg-surface border border-border-subtle rounded-full p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2.5 rounded-full transition-colors cursor-pointer',
                viewMode === 'list'
                  ? 'bg-[#2C1810] dark:bg-primary text-white'
                  : 'text-text-muted hover:text-text-main'
              )}
              title="نمای ترکیبی بیسترو"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2.5 rounded-full transition-colors cursor-pointer',
                viewMode === 'grid'
                  ? 'bg-[#2C1810] dark:bg-primary text-white'
                  : 'text-text-muted hover:text-text-main'
              )}
              title="نمای کارت‌های بزرگ"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Barista's Today Suggestion Dark Spotlight Banner */}
        {!searchQuery.trim() && spotlightProduct && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/product/${spotlightProduct.id}`)}
            className="bg-[#2D1810] text-white rounded-3xl p-5 sm:p-6 mb-6 flex items-center justify-between gap-4 cursor-pointer shadow-md hover:shadow-lg transition-all relative overflow-hidden"
          >
            {/* Right Content */}
            <div className="flex flex-col items-start text-right flex-1 min-w-0 z-10">
              <span className="inline-flex items-center gap-1 bg-[#8C5230] text-[#FDE68A] text-[11px] font-bold px-3 py-1 rounded-full mb-2.5">
                <Star size={12} className="fill-[#FDE68A]" />
                <span>پیشنهاد باریستا امروز</span>
              </span>
              <h2 className="text-lg sm:text-2xl font-extrabold text-white truncate w-full mb-1">
                {spotlightProduct.name}
              </h2>
              <p className="text-xs text-white/75 line-clamp-1 mb-4">
                {spotlightProduct.description}
              </p>

              <div className="flex flex-wrap items-center justify-between w-full gap-3 mt-auto pt-2 border-t border-white/10">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-extrabold text-white tabular-nums">
                    {formatPriceNumber(spotlightProduct.price)}
                  </span>
                  <span className="text-xs text-white/80 font-medium">تومان</span>
                </div>
                <span className="text-xs text-[#FDE68A] font-semibold flex items-center gap-0.5">
                  <span>مشاهده جزئیات</span>
                  <ChevronLeft size={14} />
                </span>
              </div>
            </div>

            {/* Left Circular Image */}
            <div className="w-24 h-24 sm:w-30 sm:h-30 rounded-full p-1 border-2 border-[#A05A2C]/60 shrink-0 z-10">
              <img
                src={resolveProductImage(
                  spotlightProduct.image_url,
                  spotlightProduct.name,
                  spotlightProduct.category_id
                )}
                alt={spotlightProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </motion.div>
        )}

        {/* Horizontal Category Pills */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto no-scrollbar gap-2.5 pb-2 mb-6 items-center"
        >
          <button
            onClick={() => {
              setActiveTab('all');
              setSearchQuery('');
            }}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5',
              activeTab === 'all'
                ? 'bg-[#2C1810] dark:bg-primary text-white shadow-xs'
                : 'bg-bg-surface border border-border-subtle text-text-main hover:border-primary/40'
            )}
          >
            <UtensilsCrossed size={14} />
            <span>همه دسته‌ها</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveTab(cat.id);
                setSearchQuery('');
              }}
              className={cn(
                'px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer',
                activeTab === cat.id
                  ? 'bg-[#2C1810] dark:bg-primary text-white shadow-xs'
                  : 'bg-bg-surface border border-border-subtle text-text-main hover:border-primary/40'
              )}
            >
              {cat.name}
            </button>
          ))}

          <button
            onClick={() => {
              setActiveTab(-1);
              setSearchQuery('');
            }}
            className={cn(
              'px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1',
              activeTab === -1
                ? 'bg-[#2C1810] dark:bg-primary text-white shadow-xs'
                : 'bg-bg-surface border border-border-subtle text-text-main hover:border-primary/40'
            )}
          >
            <Sparkles size={13} />
            <span>پیشنهاد سرآشپز</span>
          </button>
        </div>

        {/* Menu Sections & Items */}
        {searchQuery.trim() || activeTab !== 'all' ? (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 rounded-full bg-[#9E4733] inline-block" />
                <h2 className="text-lg sm:text-xl font-extrabold text-text-main">
                  {searchQuery.trim()
                    ? `نتایج جستجو: ${searchQuery}`
                    : activeTab === -1
                    ? 'پیشنهاد ویژه سرآشپز'
                    : categories.find((c) => c.id === activeTab)?.name}
                </h2>
              </div>
              <span className="text-xs text-text-muted tabular-nums">
                {filteredProducts.length.toLocaleString('fa-IR')} مورد
              </span>
            </div>

            {filteredProducts.length > 0 ? (
              <div
                className={cn(
                  'grid gap-4',
                  viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                )}
              >
                {filteredProducts.map((p, idx) =>
                  viewMode === 'grid' || (idx === 0 && p.is_special === 1)
                    ? renderShowcaseCard(p)
                    : renderHorizontalCard(p)
                )}
              </div>
            ) : (
              <div className="py-14 text-center text-text-muted bg-bg-surface border border-border-subtle rounded-3xl">
                <Coffee className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">موردی در این بخش یافت نشد.</p>
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-9">
            {categories.map((cat, catIdx) => {
              const catItems = availableProducts.filter((p) => p.category_id === cat.id);
              if (catItems.length === 0) return null;

              return (
                <section key={cat.id}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-1.5 h-6 rounded-full bg-[#9E4733] inline-block" />
                      <h2 className="text-lg sm:text-xl font-extrabold text-text-main">
                        {cat.name}
                      </h2>
                    </div>
                    <span className="text-xs text-text-muted tabular-nums">
                      {catItems.length.toLocaleString('fa-IR')} مورد منتخب
                    </span>
                  </div>

                  <div
                    className={cn(
                      'grid gap-4',
                      viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                    )}
                  >
                    {catItems.map((product, itemIdx) => {
                      const shouldShowcase =
                        viewMode === 'grid' ||
                        (catIdx >= 2 && itemIdx === 0 && product.is_special === 1);
                      return shouldShowcase
                        ? renderShowcaseCard(product)
                        : renderHorizontalCard(product);
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border-subtle text-center text-xs text-text-muted">
          <p>{brand.cafe_name} — {brand.cafe_subtitle}</p>
        </footer>
      </div>

      {/* Table QR Code Generator Modal */}
      <AnimatePresence>
        {qrModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setQrModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-surface border border-border-subtle rounded-3xl p-6 max-w-sm w-full text-center shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-text-main">استند QR کد منوی میز</h3>
                <button
                  onClick={() => setQrModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-bg-subtle flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-border-subtle inline-flex flex-col items-center mb-4">
                <svg viewBox="0 0 120 120" className="w-44 h-44 text-[#1C231A]" fill="currentColor">
                  <rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="18" y="18" width="12" height="12" rx="2" />
                  <rect x="80" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="90" y="18" width="12" height="12" rx="2" />
                  <rect x="8" y="80" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                  <rect x="18" y="90" width="12" height="12" rx="2" />
                  <rect x="48" y="12" width="8" height="8" />
                  <rect x="60" y="12" width="8" height="16" />
                  <rect x="48" y="28" width="8" height="12" />
                  <rect x="12" y="48" width="16" height="8" />
                  <rect x="36" y="48" width="16" height="8" />
                  <rect x="60" y="44" width="12" height="12" rx="2" />
                  <rect x="80" y="48" width="12" height="8" />
                  <rect x="100" y="48" width="12" height="16" />
                  <rect x="48" y="64" width="16" height="8" />
                  <rect x="72" y="64" width="8" height="16" />
                  <rect x="88" y="68" width="16" height="8" />
                  <rect x="48" y="80" width="8" height="16" />
                  <rect x="64" y="88" width="16" height="8" />
                  <rect x="88" y="84" width="12" height="12" />
                  <rect x="104" y="96" width="8" height="16" />
                  <rect x="56" y="104" width="24" height="8" />
                </svg>
                <span className="mt-3 text-xs font-bold text-[#2D2926]">
                  میز شماره {tableNumber || '۴'} — {brand.cafe_name}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5">
                  دوربین گوشی را باز کرده و کد را اسکن کنید
                </span>
              </div>

              <div className="mb-4 text-right">
                <label className="block text-xs text-text-muted mb-1">شماره یا نام میز:</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-base border border-border-subtle text-sm text-center font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-[#2C1810] text-white text-xs font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
              >
                چاپ یا ذخیره استند QR میز
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

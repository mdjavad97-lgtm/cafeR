import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee,
  Loader2,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Search,
  Menu,
  X,
  LayoutGrid,
  List,
  QrCode,
  Palette,
  Presentation,
  SlidersHorizontal,
  Settings2,
} from 'lucide-react';
import {
  cn,
  formatPrice,
  GENERATED_IMAGES,
  resolveProductImage,
  BrandSettings,
  DEFAULT_BRAND_SETTINGS,
} from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

const BRAND_THEMES = [
  { id: 'botanical', label: 'سبز بوتانیکال', color: '#5B6346' },
  { id: 'espresso', label: 'اسپرسو کلاسیک', color: '#6F4E37' },
  { id: 'terracotta', label: 'رستوران ایتالیایی', color: '#9E4733' },
  { id: 'royal', label: 'سرمه‌ای لوکس', color: '#1E3A5F' },
] as const;

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [quickBrandOpen, setQuickBrandOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('۱۲');
  const [brandTheme, setBrandTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'botanical';
    return localStorage.getItem('brand_theme') || 'botanical';
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window === 'undefined') return 'grid';
    const stored = localStorage.getItem('viewMode');
    return stored === 'list' || stored === 'grid' ? stored : 'grid';
  });

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (brandTheme === 'botanical') {
      root.removeAttribute('data-brand');
    } else {
      root.setAttribute('data-brand', brandTheme);
    }
    localStorage.setItem('brand_theme', brandTheme);
  }, [brandTheme]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const navigate = useNavigate();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const scrollAbs = Math.abs(scrollLeft);
      const maxScroll = scrollWidth - clientWidth;

      if (maxScroll > 0) {
        setCanScrollLeft(scrollAbs < maxScroll - 2);
        setCanScrollRight(scrollAbs > 2);
      } else {
        setCanScrollLeft(false);
        setCanScrollRight(false);
      }
    }
  };

  useEffect(() => {
    const timeout = setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkScroll);
    };
  }, [categories]);

  const doScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const sign = direction === 'left' ? -1 : 1;
      scrollContainerRef.current.scrollBy({ left: sign * 200, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
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
      fetch(`${import.meta.env.BASE_URL}api/settings`).then((r) => r.json()).catch(() => DEFAULT_BRAND_SETTINGS),
    ]).then(([cats, prods, settingsData]) => {
      const allCats = [{ id: -1, name: 'پیشنهاد سرآشپز', sort_order: 0 }, ...cats];
      setCategories(allCats);
      setProducts(prods);
      if (settingsData && settingsData.cafe_name) {
        setBrand({ ...DEFAULT_BRAND_SETTINGS, ...settingsData });
        if (!localStorage.getItem('brand_theme') && settingsData.brand_theme) {
          setBrandTheme(settingsData.brand_theme);
        }
        document.title = `${settingsData.cafe_name} | منوی دیجیتال`;
      }
      if (allCats.length > 0) setActiveTab(cats.length > 0 ? cats[0].id : -1);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const filteredProducts = products.filter((p) => {
    if (p.is_available === 0) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    return activeTab === -1 ? p.is_special === 1 : p.category_id === activeTab;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleOneClickAdmin = () => {
    localStorage.setItem('admin_token', 'admin-mock-token');
    toast.success('ورود به پنل مدیریت و تنظیمات برند');
    navigate('/admin/dashboard');
  };

  const handleQuickBrandSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer admin-mock-token',
        },
        body: JSON.stringify({ ...brand, brand_theme: brandTheme }),
      });
      if (res.ok) {
        document.title = `${brand.cafe_name} | منوی دیجیتال`;
        toast.success(`نام و هویت بصری به «${brand.cafe_name}» تغییر یافت`);
        setQuickBrandOpen(false);
      } else {
        toast.error('خطا در ذخیره تنظیمات');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  const resolveImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('/src/assets/')) return url;
    return `${import.meta.env.BASE_URL}${url.replace(/^\//, '')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  const heroBannerSrc = resolveImageUrl(brand.hero_url) || GENERATED_IMAGES.hero;
  const logoSrc = resolveImageUrl(brand.logo_url);

  return (
    <div className="min-h-screen pb-24 relative bg-bg-base text-text-main font-sans" dir="rtl">
      {/* Slim Interactive B2B Pitch Top Bar for Cafe Presentations */}
      <div className="bg-bg-surface border-b border-border-subtle px-4 py-2 text-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-text-muted">
            <span className="font-semibold text-text-main">پلتفرم منوی دیجیتال اختصاصی</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <div className="hidden sm:flex items-center gap-1.5">
              <span>پالت رنگی:</span>
              {BRAND_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setBrandTheme(t.id);
                    toast.success(`تم رنگی «${t.label}» فعال شد`);
                  }}
                  title={t.label}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer whitespace-nowrap shrink-0',
                    brandTheme === t.id
                      ? 'bg-primary text-white font-semibold'
                      : 'bg-bg-subtle text-text-muted hover:text-text-main'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mr-auto sm:mr-0">
            <button
              onClick={() => setQuickBrandOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-subtle text-text-main hover:border-primary transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              title="تغییر سریع نام و لوگوی کافه برای پرزنت به مشتری"
            >
              <Settings2 size={13} className="text-primary" />
              <span>تغییر نام و برند کافه</span>
            </button>
            <button
              onClick={() => setQrModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-subtle text-text-main hover:border-primary transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <QrCode size={13} className="text-primary" />
              <span>QR کد میز</span>
            </button>
            <button
              onClick={handleOneClickAdmin}
              className="px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-subtle text-text-main hover:border-primary transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal size={13} className="text-primary" />
              <span>پنل مدیریت</span>
            </button>
            <button
              onClick={() => navigate('/pitch')}
              className="px-3 py-1 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Presentation size={13} />
              <span>معرفی و خرید محصول</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hamburger Menu Button */}
      <div className="absolute top-14 left-6 z-40">
        <button
          onClick={() => setIsMenuOpen(true)}
          aria-label="باز کردن منوی جستجو"
          className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/65 transition-all shadow-sm cursor-pointer"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-14 right-6 z-40">
        <button
          onClick={() => setIsDark(!isDark)}
          aria-label="تغییر حالت روز و شب"
          className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/65 transition-all shadow-sm cursor-pointer"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Mobile Menu & Search Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-bg-base flex flex-col pt-12 px-6"
          >
            <button
              onClick={() => setIsMenuOpen(false)}
              className="absolute top-6 right-6 w-11 h-11 rounded-full bg-bg-surface border border-border-subtle flex items-center justify-center text-primary hover:bg-bg-subtle transition-all shadow-sm z-10 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center flex-1 mt-6 w-full max-w-md mx-auto">
              <div className="text-center mb-6 flex flex-col items-center">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={brand.cafe_name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-contain mb-3 border border-border-subtle p-1 bg-bg-surface"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Coffee size={24} />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-text-main tracking-tight">{brand.cafe_name}</h2>
                {brand.cafe_en_name && (
                  <p className="text-xs text-text-muted mt-1">{brand.cafe_en_name}</p>
                )}
              </div>

              {/* Brand Theme Selector inside Drawer for Mobile Presentations */}
              <div className="w-full mb-5 bg-bg-surface border border-border-subtle rounded-2xl p-3">
                <div className="flex items-center justify-between text-xs font-medium text-text-muted mb-2">
                  <div className="flex items-center gap-1.5">
                    <Palette size={14} className="text-primary" />
                    <span>تغییر زنده تم رنگی کافه:</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setQuickBrandOpen(true);
                    }}
                    className="text-primary font-semibold hover:underline cursor-pointer"
                  >
                    ویرایش نام کافه
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {BRAND_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setBrandTheme(t.id)}
                      className={cn(
                        'py-2 px-3 rounded-xl text-xs font-medium transition-colors text-right flex items-center gap-2 cursor-pointer',
                        brandTheme === t.id
                          ? 'bg-primary text-white'
                          : 'bg-bg-subtle text-text-main hover:bg-border-subtle/50'
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full mb-6">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-text-muted">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="جستجوی نام آیتم یا محتویات (مثلاً لاته، سزار، ماچا)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-surface border border-border-subtle rounded-2xl py-3.5 pr-10 pl-4 text-sm text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
                  dir="rtl"
                />
              </div>

              <div className="w-full flex-1 overflow-y-auto mb-4 -mx-2 px-2 pb-4 no-scrollbar">
                {searchQuery.trim() !== '' ? (
                  <div className="flex flex-col gap-2">
                    {filteredProducts.slice(0, 10).map((product) => {
                      const imgSrc = resolveProductImage(product.image_url, product.name, product.category_id);
                      return (
                        <div
                          key={product.id}
                          onClick={() => {
                            setIsMenuOpen(false);
                            navigate(`/product/${product.id}`);
                          }}
                          className="flex items-center gap-3 bg-bg-surface p-2.5 rounded-2xl border border-border-subtle cursor-pointer hover:bg-bg-subtle transition-colors"
                          dir="rtl"
                        >
                          <img
                            src={imgSrc}
                            alt={product.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = GENERATED_IMAGES.floralLatte;
                            }}
                            className="w-14 h-14 rounded-xl object-cover shrink-0"
                          />
                          <div className="flex flex-col text-right flex-1">
                            <span className="font-semibold text-sm text-text-main line-clamp-1">{product.name}</span>
                            <span className="text-primary text-xs font-bold mt-1 tabular-nums">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <div className="text-center text-text-muted text-sm py-8 bg-bg-surface rounded-2xl border border-border-subtle border-dashed">
                        هیچ محصولی با این عبارت پیدا نشد
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mb-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setActiveTab(cat.id);
                          setSearchQuery('');
                          setIsMenuOpen(false);
                        }}
                        className={cn(
                          'w-full text-right py-3 px-4 rounded-xl text-sm font-medium transition-colors cursor-pointer',
                          activeTab === cat.id
                            ? 'bg-primary text-white'
                            : 'bg-bg-surface text-text-main hover:bg-bg-subtle border border-border-subtle'
                        )}
                        dir="rtl"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full flex items-center justify-between gap-3 pt-4 border-t border-border-subtle mb-8">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/pitch');
                  }}
                  className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold text-center cursor-pointer"
                >
                  معرفی و سفارش این منو برای کافه شما
                </button>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleOneClickAdmin();
                  }}
                  className="py-3 px-4 bg-bg-surface border border-border-subtle text-text-main rounded-xl text-xs font-semibold cursor-pointer"
                >
                  پنل مدیریت
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section with Customizable Brand & Photography */}
      <section className="relative h-72 md:h-96 w-full overflow-hidden bg-bg-surface">
        <img
          src={heroBannerSrc}
          alt={brand.cafe_name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = GENERATED_IMAGES.hero;
          }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center max-w-xl"
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brand.cafe_name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-contain bg-white/15 backdrop-blur-md border border-white/25 p-2 mb-4 shadow-lg"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white mb-4 shadow-lg">
                <Coffee size={28} />
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2">
              {brand.cafe_name}
            </h1>
            {brand.cafe_subtitle && (
              <p className="text-white/85 text-xs md:text-sm font-medium max-w-md leading-relaxed">
                {brand.cafe_subtitle}
              </p>
            )}
            <div className="flex flex-wrap justify-center items-center gap-2 text-[11px] text-white/75 mt-4">
              {brand.working_hours && <span>{brand.working_hours}</span>}
              {brand.working_hours && brand.service_note && <span aria-hidden="true">·</span>}
              {brand.service_note && <span>{brand.service_note}</span>}
              {brand.service_note && brand.wifi_info && <span aria-hidden="true">·</span>}
              {brand.wifi_info && <span>{brand.wifi_info}</span>}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Categories Tabs */}
      <div className="sticky top-0 z-30 bg-bg-surface/90 backdrop-blur-md shadow-xs border-b border-border-subtle relative w-full overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10 flex items-center">
          <div
            ref={scrollContainerRef}
            onScroll={checkScroll}
            className="flex overflow-x-auto no-scrollbar py-4 gap-7 items-center w-full relative"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.id);
                  setSearchQuery('');
                }}
                className={cn(
                  'whitespace-nowrap shrink-0 pb-1.5 text-sm transition-all duration-200 relative cursor-pointer',
                  activeTab === cat.id
                    ? 'font-bold text-primary'
                    : 'font-medium text-text-muted hover:text-text-main'
                )}
              >
                {cat.name}
                {activeTab === cat.id && (
                  <motion.div
                    layoutId="underline"
                    className="absolute left-0 right-0 bottom-0 h-0.5 bg-primary rounded-full"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Scroll indicators */}
          <AnimatePresence>
            {canScrollLeft && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-bg-surface via-bg-surface/80 to-transparent flex items-center justify-start z-20 px-2 cursor-pointer"
                onClick={() => doScroll('left')}
              >
                <ChevronLeft className="text-primary pointer-events-none" size={22} />
              </motion.div>
            )}

            {canScrollRight && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-bg-surface via-bg-surface/80 to-transparent flex items-center justify-end z-20 px-2 cursor-pointer"
                onClick={() => doScroll('right')}
              >
                <ChevronRight className="text-primary pointer-events-none" size={22} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Menu Area */}
      <main className="max-w-6xl mx-auto px-6 md:px-12 pt-10">
        {/* Quick Search + View Switcher Bar */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-4 border-b border-border-subtle pb-6">
          <div className="text-right">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-text-main mb-1">
              {searchQuery.trim()
                ? `جستجو: ${searchQuery}`
                : categories.find((c) => c.id === activeTab)?.name}
            </h2>
            <p className="text-xs text-text-muted">
              برای مشاهده جزئیات، ترکیبات و تصویر بزرگ‌تر روی هر آیتم ضربه بزنید
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Inline Quick Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
              />
              <input
                type="text"
                placeholder="جستجو در منو..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-surface border border-border-subtle rounded-xl py-2 pr-9 pl-3 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* View Toggle Controls */}
            <div className="flex gap-1 bg-bg-surface p-1 rounded-xl border border-border-subtle shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer',
                  viewMode === 'grid'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-main hover:bg-bg-subtle'
                )}
                title="نمای شبکه‌ای"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer',
                  viewMode === 'list'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-main hover:bg-bg-subtle'
                )}
                title="نمای لیستی"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          <motion.div
            key={String(activeTab) + searchQuery + currentPage + viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'grid gap-6 md:gap-7',
              viewMode === 'grid'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'grid-cols-1 md:grid-cols-2'
            )}
          >
            {paginatedProducts.length > 0 ? (
              paginatedProducts.map((product) => {
                const itemKey = `product-${viewMode}-${product.id}`;
                const imgSrc = resolveProductImage(
                  product.image_url,
                  product.name,
                  product.category_id
                );

                return viewMode === 'grid' ? (
                  <div
                    key={itemKey}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="glass cursor-pointer group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
                  >
                    <div className="w-full aspect-[4/3] bg-bg-subtle relative overflow-hidden border-b border-border-subtle">
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
                        <div className="absolute top-3 right-3 bg-black/65 backdrop-blur-md text-white text-[11px] font-medium px-3 py-1 rounded-lg">
                          پیشنهاد سرآشپز
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-3">
                          <h3 className="font-semibold text-base text-text-main tracking-tight line-clamp-1">
                            {product.name}
                          </h3>
                          <span className="font-bold text-sm text-primary tabular-nums whitespace-nowrap shrink-0">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                          {product.description || 'تهیه شده با مواد اولیه تازه روز'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={itemKey}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="glass cursor-pointer group flex flex-row items-stretch h-36 md:h-40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 overflow-hidden"
                  >
                    <div className="w-32 md:w-40 bg-bg-subtle relative overflow-hidden border-l border-border-subtle shrink-0">
                      <img
                        src={imgSrc}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = GENERATED_IMAGES.floralLatte;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-4 md:p-5 flex flex-col flex-1 justify-between text-right">
                      <div>
                        <div className="flex justify-between items-start mb-1.5 gap-2">
                          <h3 className="font-semibold text-sm md:text-base text-text-main tracking-tight line-clamp-1">
                            {product.name}
                          </h3>
                          <span className="font-bold text-xs md:text-sm text-primary tabular-nums whitespace-nowrap shrink-0">
                            {formatPrice(product.price)}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                          {product.description || 'تهیه شده با مواد اولیه تازه روز'}
                        </p>
                      </div>
                      {product.is_special === 1 && (
                        <div className="text-[11px] font-medium text-primary">
                          پیشنهاد ویژه سرآشپز
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-text-muted flex flex-col items-center">
                <Coffee className="w-12 h-12 mb-4 opacity-30" />
                <p>موردی در این دسته‌بندی یافت نشد.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12 mb-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-border-subtle bg-bg-surface text-text-muted hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>

            <div className="flex items-center gap-1" dir="ltr">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    'w-8 h-8 rounded-xl text-sm font-medium tabular-nums transition-all',
                    currentPage === i + 1
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-bg-surface text-text-muted border border-border-subtle hover:bg-bg-subtle'
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-border-subtle bg-bg-surface text-text-muted hover:bg-bg-subtle disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}

        {/* B2B Product Callout Banner at Bottom of Menu for Cafe Owners */}
        <div className="mt-16 bg-bg-surface border border-border-subtle rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-primary mb-1">
              صاحب کافه یا رستوران هستید؟
            </p>
            <h3 className="text-lg md:text-xl font-bold text-text-main mb-1">
              همین منوی دیجیتال را با نام، لوگو و رنگ‌بندی اختصاصی مجموعه خود فعال کنید
            </h3>
            <p className="text-xs text-text-muted">
              تغییر لحظه‌ای قیمت‌ها با موبایل، شخصی‌سازی کامل برند در تنظیمات، و QR کد اختصاصی هر میز.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setQuickBrandOpen(true)}
              className="px-4 py-3 bg-bg-subtle border border-border-subtle text-text-main text-xs font-semibold rounded-xl hover:border-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              تست نام کافه شما روی همین منو
            </button>
            <button
              onClick={() => navigate('/pitch')}
              className="px-5 py-3 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap"
            >
              مشاهده تعرفه‌ها و امکانات
            </button>
          </div>
        </div>
      </main>

      {/* Quick Brand Customizer Modal (For Live Client Demos) */}
      <AnimatePresence>
        {quickBrandOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setQuickBrandOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-surface border border-border-subtle rounded-3xl p-6 max-w-md w-full text-right shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-text-main">شخصی‌سازی نام و برند کافه</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    نام مجموعه مشتری را وارد کنید تا منو و استند QR با برند او نمایش داده شود
                  </p>
                </div>
                <button
                  onClick={() => setQuickBrandOpen(false)}
                  className="w-8 h-8 rounded-full bg-bg-subtle flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer shrink-0"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Demo Presets */}
              <div className="mb-4">
                <span className="block text-[11px] text-text-muted mb-1.5">نمونه‌های آماده برای تست سریع:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      name: 'کافه تخصصی روبرتو',
                      sub: 'قهوه تخصصی دست‌ساز و کیک‌های روزانه',
                      theme: 'espresso',
                    },
                    {
                      name: 'رستوران ایتالیایی بلاموندو',
                      sub: 'پاستا، پیتزای ناپولیتن و سالادهای مدیترانه‌ای',
                      theme: 'terracotta',
                    },
                    {
                      name: 'کافه بیکری و برانچ آروما',
                      sub: 'نان خمیرترش، کروسان کره‌ای و صبحانه تخصصی',
                      theme: 'botanical',
                    },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBrand((prev) => ({
                          ...prev,
                          cafe_name: preset.name,
                          cafe_subtitle: preset.sub,
                        }));
                        setBrandTheme(preset.theme);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-subtle hover:border-primary text-text-main transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleQuickBrandSave} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1">نام کافه یا رستوران</label>
                  <input
                    type="text"
                    required
                    value={brand.cafe_name}
                    onChange={(e) => setBrand({ ...brand, cafe_name: e.target.value })}
                    placeholder="مثال: کافه رستوران اوریجینال"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">شعار یا توضیح زیر نام کافه</label>
                  <input
                    type="text"
                    value={brand.cafe_subtitle}
                    onChange={(e) => setBrand({ ...brand, cafe_subtitle: e.target.value })}
                    placeholder="مثال: قهوه تخصصی و صبحانه تمام‌روز"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">ساعت کاری مجموعه</label>
                  <input
                    type="text"
                    value={brand.working_hours}
                    onChange={(e) => setBrand({ ...brand, working_hours: e.target.value })}
                    placeholder="مثال: ساعت کاری ۸ صبح تا ۱۲ شب"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">پالت رنگی برند</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BRAND_THEMES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBrandTheme(t.id)}
                        className={cn(
                          'py-2 px-3 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer',
                          brandTheme === t.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-bg-base text-text-main border-border-subtle'
                        )}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                          style={{ backgroundColor: t.color }}
                        />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    ذخیره و اعمال روی منو
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickBrandOpen(false);
                      handleOneClickAdmin();
                    }}
                    className="py-3 px-3.5 bg-bg-subtle border border-border-subtle text-text-main text-xs font-semibold rounded-xl hover:border-primary transition-colors cursor-pointer"
                  >
                    تنظیمات کامل و آپلود لوگو
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  میز شماره {tableNumber || '۱'} — {brand.cafe_name}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5">
                  دوربین گوشی را باز کرده و کد را اسکن کنید
                </span>
              </div>

              <div className="mb-4 text-right">
                <label className="block text-xs text-text-muted mb-1">شماره یا نام میز برای چاپ روی استند:</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-bg-base border border-border-subtle text-sm text-center font-bold focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-primary text-white text-xs font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
              >
                چاپ یا ذخیره استند QR میز
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-text-muted mt-12 border-t border-border-subtle font-sans">
        <p>{brand.cafe_name} — {brand.footer_text || 'پلتفرم منوی دیجیتال هوشمند کافه و رستوران'}</p>
      </footer>
    </div>
  );
}

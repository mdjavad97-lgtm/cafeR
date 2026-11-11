import React, { useState, useEffect, useRef } from 'react';
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
  Presentation,
  SlidersHorizontal,
  Settings2,
  Plus,
  Minus,
  Star,
  ShoppingBag,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  UtensilsCrossed,
} from 'lucide-react';
import {
  cn,
  formatPrice,
  formatPriceNumber,
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
  { id: 'espresso', label: 'اسپرسو و بیسترو (پیش‌فرض)', color: '#3A2218' },
  { id: 'botanical', label: 'سبز بوتانیکال', color: '#5B6346' },
  { id: 'terracotta', label: 'رستوران ایتالیایی', color: '#9E4733' },
  { id: 'royal', label: 'سرمه‌ای لوکس', color: '#1E3A5F' },
] as const;

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [brand, setBrand] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [quickBrandOpen, setQuickBrandOpen] = useState(false);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [tableNumber, setTableNumber] = useState('۴');

  // Table Cart State: { [productId]: quantity }
  const [cart, setCart] = useState<Record<number, number>>({});

  const [brandTheme, setBrandTheme] = useState<string>(() => {
    if (typeof window === 'undefined') return 'espresso';
    return localStorage.getItem('brand_theme') || 'espresso';
  });

  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'list';
    const stored = localStorage.getItem('viewMode');
    return stored === 'list' || stored === 'grid' ? stored : 'list';
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
        document.title = `${settingsData.cafe_name} | منوی دیجیتال`;
      }
      setLoading(false);
    });
  }, []);

  const availableProducts = products.filter((p) => p.is_available !== 0);

  // Featured Barista Spotlight Item (first special item or first product)
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

  const addToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setOrderSubmitted(false);
    setCart((prev) => ({
      ...prev,
      [product.id]: (prev[product.id] || 0) + 1,
    }));
    toast.success(`«${product.name}» به سفارش میز ${tableNumber} اضافه شد`);
  };

  const updateCartQty = (e: React.MouseEvent, productId: number, delta: number) => {
    e.stopPropagation();
    setCart((prev) => {
      const nextQty = (prev[productId] || 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: nextQty };
    });
  };

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const product = products.find((p) => p.id === Number(id));
      return product ? { product, qty: Number(qty) } : null;
    })
    .filter(Boolean) as { product: Product; qty: number }[];

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const totalCartPrice = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
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

  const logoSrc = resolveImageUrl(brand.logo_url);

  // Render a single horizontal List Card (matching "فلت وایت تخصصی" / "کورتادو جیبرالتار" in screenshot)
  const renderHorizontalCard = (product: Product) => {
    const imgSrc = resolveProductImage(product.image_url, product.name, product.category_id);
    const qty = cart[product.id] || 0;

    return (
      <div
        key={`horiz-${product.id}`}
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-bg-surface border border-border-subtle rounded-[28px] p-4 flex items-center gap-4 cursor-pointer group hover:shadow-md hover:border-primary/35 transition-all"
      >
        {/* Right Side (in RTL): Circular / Soft Rounded Image */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0">
          <img
            src={imgSrc}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = GENERATED_IMAGES.floralLatte;
            }}
            className="w-full h-full rounded-full object-cover border-2 border-border-subtle group-hover:scale-105 transition-transform duration-500 shadow-xs"
          />
          {product.is_special === 1 && (
            <span className="absolute -top-1 right-0 bg-[#3A2218] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
              محبوب
            </span>
          )}
        </div>

        {/* Left Side (in RTL): Title, Description, and Bottom Price + Action Row */}
        <div className="flex flex-col flex-1 min-w-0 text-right">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-base sm:text-lg text-text-main truncate">
              {product.name}
            </h3>
          </div>

          <p className="text-xs text-text-muted leading-relaxed line-clamp-2 mt-1 mb-3">
            {product.description || 'تهیه شده با مواد اولیه تازه و دستورالعمل اختصاصی'}
          </p>

          {/* Bottom Row: Price on Right (RTL), Add Button on Left (RTL) */}
          <div className="flex items-end justify-between gap-2 mt-auto pt-1">
            {/* Price Block */}
            <div className="flex flex-col items-start text-right">
              <span className="text-[11px] text-text-muted leading-none mb-1">
                قیمت
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-extrabold text-text-main tabular-nums tracking-tight">
                  {formatPriceNumber(product.price)}
                </span>
                <span className="text-xs font-medium text-text-muted">
                  تومان
                </span>
              </div>
            </div>

            {/* Action Button (+ or Stepper) */}
            {qty > 0 ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 bg-[#2C1810] dark:bg-primary text-white rounded-full px-2 py-1 shadow-xs"
              >
                <button
                  onClick={(e) => updateCartQty(e, product.id, 1)}
                  className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 cursor-pointer"
                >
                  <Plus size={14} />
                </button>
                <span className="text-xs font-bold tabular-nums px-1">
                  {qty.toLocaleString('fa-IR')}
                </span>
                <button
                  onClick={(e) => updateCartQty(e, product.id, -1)}
                  className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 cursor-pointer"
                >
                  <Minus size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => addToCart(e, product)}
                aria-label={`افزودن ${product.name}`}
                className="w-10 h-10 rounded-full bg-[#2C1810] dark:bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0 shadow-xs"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render a Featured Showcase Card (matching "تست آووکادو با تخم‌مرغ پوچد" in screenshot)
  const renderShowcaseCard = (product: Product) => {
    const imgSrc = resolveProductImage(product.image_url, product.name, product.category_id);
    const qty = cart[product.id] || 0;

    return (
      <div
        key={`showcase-${product.id}`}
        onClick={() => navigate(`/product/${product.id}`)}
        className="bg-bg-surface border border-border-subtle rounded-[32px] p-4 sm:p-5 flex flex-col justify-between cursor-pointer group hover:shadow-md hover:border-primary/35 transition-all"
      >
        <div>
          {/* Large Top Rounded Image */}
          <div className="w-full aspect-[16/10] rounded-[24px] overflow-hidden relative bg-bg-subtle mb-4 border border-border-subtle/60">
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
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="bg-[#9E4733] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
                  پیشنهاد شف
                </span>
              </div>
            )}
          </div>

          {/* Title + Rating Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-extrabold text-lg sm:text-xl text-text-main line-clamp-1">
              {product.name}
            </h3>
            <div className="flex items-center gap-1 text-amber-600 text-xs font-bold shrink-0">
              <span className="tabular-nums">۴.۹</span>
              <Star size={13} className="fill-amber-500 text-amber-500" />
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-text-muted leading-relaxed line-clamp-2 mb-5">
            {product.description || 'تهیه شده با مواد اولیه تازه و دستورالعمل اختصاصی سرآشپز'}
          </p>
        </div>

        {/* Bottom Price & Action Bar (matching screenshot: Price on Right, + افزودن on Left) */}
        <div className="flex items-end justify-between gap-3 pt-3 border-t border-border-subtle/70 mt-auto">
          <div className="flex flex-col items-start text-right">
            <span className="text-[11px] text-text-muted leading-none mb-1">
              قیمت سفارش
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-extrabold text-text-main tabular-nums tracking-tight">
                {formatPriceNumber(product.price)}
              </span>
              <span className="text-xs font-medium text-text-muted">
                تومان
              </span>
            </div>
          </div>

          {qty > 0 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 bg-[#2C1810] dark:bg-primary text-white rounded-full px-3 py-1.5 shadow-xs"
            >
              <button
                onClick={(e) => updateCartQty(e, product.id, 1)}
                className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 cursor-pointer"
              >
                <Plus size={14} />
              </button>
              <span className="text-xs font-bold tabular-nums px-1">
                {qty.toLocaleString('fa-IR')}
              </span>
              <button
                onClick={(e) => updateCartQty(e, product.id, -1)}
                className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 cursor-pointer"
              >
                <Minus size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => addToCart(e, product)}
              className="px-5 py-2.5 rounded-full bg-[#2C1810] dark:bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-95 active:scale-95 transition-all cursor-pointer shrink-0 shadow-xs"
            >
              <Plus size={15} />
              <span>افزودن</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 relative bg-bg-base text-text-main font-sans" dir="rtl">
      {/* Slim Presenter Bar for B2B Sales Demos */}
      <div className="bg-bg-surface border-b border-border-subtle px-4 py-2 text-xs">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuickBrandOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-subtle text-text-main hover:border-primary transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 font-medium"
            >
              <Settings2 size={13} className="text-primary" />
              <span>شخصی‌سازی نام و برند کافه</span>
            </button>
            <button
              onClick={handleOneClickAdmin}
              className="px-2.5 py-1 rounded-lg bg-bg-subtle border border-border-subtle text-text-main hover:border-primary transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0 font-medium"
            >
              <SlidersHorizontal size={13} className="text-primary" />
              <span>پنل مدیریت</span>
            </button>
          </div>

          <button
            onClick={() => navigate('/pitch')}
            className="px-3 py-1 rounded-lg bg-primary text-white font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Presentation size={13} />
            <span>معرفی محصول به کافه‌داران</span>
          </button>
        </div>
      </div>

      {/* Main Container matching the mobile-first / tablet-friendly Bistro aesthetic */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5">
        {/* Top Cafe Brand Header (Matching Reference Image) */}
        <header className="flex items-center justify-between gap-3 mb-5">
          {/* Right side: Logo + Cafe Name + Table & Hours */}
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
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
                  • باز است
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                <button
                  onClick={() => setQrModalOpen(true)}
                  className="hover:text-primary transition-colors cursor-pointer font-medium"
                >
                  میز شماره {tableNumber}
                </button>
                <span aria-hidden="true">·</span>
                <span className="truncate">{brand.working_hours || '۱۰:۰۰ تا ۲۳:۳۰'}</span>
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

        {/* Search Input Bar + View Switcher (Matching Reference Image) */}
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
              title="نمای ترکیبی بیسترو (پیشنهادی)"
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

        {/* Barista's Today Suggestion Dark Spotlight Banner (Matching Reference Image) */}
        {!searchQuery.trim() && spotlightProduct && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate(`/product/${spotlightProduct.id}`)}
            className="bg-[#2D1810] text-white rounded-[32px] p-5 sm:p-6 mb-6 flex items-center justify-between gap-4 cursor-pointer shadow-md hover:shadow-lg transition-all relative overflow-hidden"
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

              <div className="flex flex-wrap items-center gap-3 mt-auto">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-extrabold text-white tabular-nums">
                    {formatPriceNumber(spotlightProduct.price)}
                  </span>
                  <span className="text-xs text-white/80 font-medium">تومان</span>
                </div>
                <button
                  onClick={(e) => addToCart(e, spotlightProduct)}
                  className="bg-[#A05A2C] hover:bg-[#B36633] text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>سفارش سریع</span>
                </button>
              </div>
            </div>

            {/* Left Circular Image */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full p-1 border-2 border-[#A05A2C]/60 shrink-0 z-10">
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

        {/* Horizontal Category Pills (Matching Reference Image) */}
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
          /* Filtered View (Single Category or Search Results) */
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
          /* All Categories Grouped View (Matching the Reference Screenshot Flow!) */
          <div className="space-y-9">
            {categories.map((cat, catIdx) => {
              const catItems = availableProducts.filter((p) => p.category_id === cat.id);
              if (catItems.length === 0) return null;

              return (
                <section key={cat.id}>
                  {/* Category Section Header */}
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

                  {/* Items Grid / List */}
                  <div
                    className={cn(
                      'grid gap-4',
                      viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                    )}
                  >
                    {catItems.map((product, itemIdx) => {
                      // In mixed Bistro mode ('list'), highlight the featured special item in brunch/salad as a large showcase card just like the reference image!
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

        {/* Direct Table Order Info Box (Matching bottom of Reference Screenshot) */}
        <div className="mt-10 bg-bg-subtle border border-border-subtle rounded-3xl p-5 text-center">
          <p className="text-xs sm:text-sm font-bold text-[#8C4A27] dark:text-primary mb-1">
            سفارش به طور مستقیم به صندوق میز {tableNumber} ارسال می‌شود
          </p>
          <p className="text-xs text-text-muted">
            امکان پرداخت آنلاین پس از تایید توسط مهماندار یا تسویه در هنگام ترک میز.
          </p>
        </div>
      </div>

      {/* Floating Bottom Table Order Bar (Matching Reference Screenshot) */}
      <div className="fixed bottom-4 inset-x-4 z-40 max-w-xl mx-auto">
        {totalCartCount > 0 ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#2C1810] text-white rounded-3xl p-3.5 sm:px-5 flex items-center justify-between gap-4 shadow-xl border border-white/10"
          >
            {/* Right side in RTL: Bag Icon with Badge + Table Price Total */}
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl bg-[#8C5230] flex items-center justify-center shrink-0">
                <ShoppingBag size={20} />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[#2C1810] text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow-xs">
                  {totalCartCount.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[11px] text-white/70">
                  سفارش میز شماره {tableNumber}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-extrabold text-white tabular-nums">
                    {formatPriceNumber(totalCartPrice)}
                  </span>
                  <span className="text-[11px] text-white/80">تومان</span>
                </div>
              </div>
            </div>

            {/* Left side in RTL: View & Submit CTA */}
            <button
              onClick={() => setOrderDrawerOpen(true)}
              className="bg-[#A05A2C] hover:bg-[#B36633] text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl flex items-center gap-2 transition-colors cursor-pointer shrink-0"
            >
              <span>مشاهده و ثبت</span>
              <ArrowLeft size={16} />
            </button>
          </motion.div>
        ) : null}
      </div>

      {/* Table Order Summary Drawer / Modal */}
      <AnimatePresence>
        {orderDrawerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setOrderDrawerOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-bg-surface border border-border-subtle rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full text-right shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-border-subtle mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-text-main">
                    لیست سفارش میز شماره {tableNumber}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">{brand.cafe_name}</p>
                </div>
                <button
                  onClick={() => setOrderDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-bg-subtle flex items-center justify-center text-text-muted hover:text-text-main cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {orderSubmitted ? (
                <div className="py-8 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h4 className="text-lg font-extrabold text-text-main">
                    سفارش میز {tableNumber} با موفقیت ثبت شد!
                  </h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    سفارش شما به بار و آشپزخانه ارسال شد و به زودی سر میز شما سرو می‌گردد.
                  </p>
                  <button
                    onClick={() => {
                      setCart({});
                      setOrderSubmitted(false);
                      setOrderDrawerOpen(false);
                    }}
                    className="mt-4 px-6 py-2.5 bg-[#2C1810] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    بستن پنجره
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
                    {cartItems.map(({ product, qty }) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 bg-bg-subtle p-3 rounded-2xl border border-border-subtle"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-text-main truncate">
                            {product.name}
                          </h4>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-xs font-extrabold text-primary tabular-nums">
                              {formatPriceNumber(product.price * qty)}
                            </span>
                            <span className="text-[10px] text-text-muted">تومان</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-[#2C1810] text-white rounded-full px-2 py-1">
                          <button
                            onClick={(e) => updateCartQty(e, product.id, 1)}
                            className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center cursor-pointer"
                          >
                            <Plus size={12} />
                          </button>
                          <span className="text-xs font-bold tabular-nums px-1">
                            {qty.toLocaleString('fa-IR')}
                          </span>
                          <button
                            onClick={(e) => updateCartQty(e, product.id, -1)}
                            className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center cursor-pointer"
                          >
                            <Minus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border-subtle space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-muted">مبلغ قابل پرداخت:</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-text-main tabular-nums">
                          {formatPriceNumber(totalCartPrice)}
                        </span>
                        <span className="text-xs font-medium text-text-muted">تومان</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setOrderSubmitted(true);
                        toast.success(`سفارش میز ${tableNumber} به صندوق ارسال شد`);
                      }}
                      className="w-full py-3.5 bg-[#2C1810] dark:bg-primary text-white text-sm font-bold rounded-2xl hover:opacity-95 transition-opacity cursor-pointer"
                    >
                      تایید و ارسال سفارش به صندوق
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

              <div className="mb-4">
                <span className="block text-[11px] text-text-muted mb-1.5">نمونه‌های آماده برای تست سریع:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      name: 'کافه و بیسترو ریشه',
                      sub: 'قهوه تخصصی، نان خمیرترش و برانچ دست‌ساز',
                      theme: 'espresso',
                    },
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
                    placeholder="مثال: کافه و بیسترو ریشه"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">ساعت کاری مجموعه</label>
                  <input
                    type="text"
                    value={brand.working_hours}
                    onChange={(e) => setBrand({ ...brand, working_hours: e.target.value })}
                    placeholder="مثال: ۱۰:۰۰ تا ۲۳:۳۰"
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
                        <span className="truncate">{t.label}</span>
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
                    آپلود لوگو در پنل
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

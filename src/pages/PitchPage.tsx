import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import {
  QrCode,
  Sparkles,
  Check,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
  Palette,
  LayoutGrid,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { GENERATED_IMAGES, formatPrice } from '../lib/utils';

export default function PitchPage() {
  const navigate = useNavigate();

  // Interactive ROI Calculator State
  const [tableCount, setTableCount] = useState(15);
  const [dailyOrders, setDailyOrders] = useState(90);
  const [reprintsPerYear, setReprintsPerYear] = useState(4);

  // Lead Capture Form State
  const [selectedPackage, setSelectedPackage] = useState('حرفه‌ای (پیشنهاد ویژه)');
  const [cafeName, setCafeName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Calculations (in Toman)
  const printingCostPerMenu = 380000; // High quality laminated/wooden menu per table
  const annualPrintSavings = tableCount * printingCostPerMenu * reprintsPerYear;
  const avgOrderIncrease = 35000; // Average visual upsell on desserts/specials per 3rd order
  const monthlyUpsellRevenue = Math.round(dailyOrders * 0.28 * avgOrderIncrease * 30);

  const handleInstantAdminDemo = () => {
    localStorage.setItem('admin_token', 'admin-mock-token');
    toast.success('ورود خودکار به پنل مدیریت دمو انجام شد');
    navigate('/admin/dashboard');
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cafeName.trim() || !phone.trim()) {
      toast.error('لطفاً نام کافه/رستوران و شماره موبایل را وارد کنید');
      return;
    }
    const phoneRegex = /^09\d{9}$/;
    const normalizedPhone = phone.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
    if (!phoneRegex.test(normalizedPhone)) {
      toast.error('شماره موبایل معتبر وارد کنید (مثال: 09123456789)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cafeName,
          ownerName,
          phone: normalizedPhone,
          city,
          packageType: selectedPackage,
        }),
      });
      if (res.ok) {
        setSubmittedSuccess(true);
        toast.success('درخواست شما ثبت شد! در پنل مدیریت قابل مشاهده است.');
      } else {
        toast.error('خطا در ثبت درخواست');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base text-text-main font-sans" dir="rtl">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="sticky top-0 z-40 bg-bg-surface/90 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => navigate('/')}
            className="text-lg font-bold tracking-tight text-text-main whitespace-nowrap shrink-0 cursor-pointer"
          >
            منوی دیجیتال هوشمند
          </button>

          {/* Zone 2: 4 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-text-muted">
            <a href="#capabilities" className="hover:text-text-main transition-colors whitespace-nowrap shrink-0">
              امکانات سیستم
            </a>
            <a href="#roi-calculator" className="hover:text-text-main transition-colors whitespace-nowrap shrink-0">
              محاسبه‌گر سود
            </a>
            <a href="#live-showcase" className="hover:text-text-main transition-colors whitespace-nowrap shrink-0">
              دموی زنده
            </a>
            <a href="#pricing" className="hover:text-text-main transition-colors whitespace-nowrap shrink-0">
              پکیج‌ها و تعرفه
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <a
              href="#order-form"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-primary rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
            >
              سفارش منوی اختصاصی
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          {/* Right Column: Value Proposition */}
          <div className="lg:col-span-7 flex flex-col justify-center text-right">
            <p className="text-xs font-semibold text-primary mb-4">
              راهکار جامع منوی دیجیتال QR و مدیریت هوشمند کافه و رستوران
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-text-main leading-[1.25] mb-6 max-w-2xl">
              منوی کاغذی را بازنشسته کنید؛ فروش آیتم‌های ویژه کافه را ۲۸٪ افزایش دهید.
            </h1>
            <p className="text-base text-text-muted leading-relaxed mb-8 max-w-xl">
              با پلتفرم اختصاصی منوی دیجیتال، مشتریان شما با اسکن QR کد روی میز، منوی تصویری و اشتهابرانگیز کافه را بدون نصب هیچ اپلیکیشنی در کمتر از ۱ ثانیه مشاهده می‌کنند و شما قیمت‌ها یا موجودی را در ۵ ثانیه با موبایل خود تغییر می‌دهید.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3.5 bg-primary text-white text-sm font-semibold rounded-2xl hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
              >
                <span>مشاهده زنده منوی مشتری</span>
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={handleInstantAdminDemo}
                className="px-6 py-3.5 bg-bg-surface text-text-main border border-border-subtle text-sm font-semibold rounded-2xl hover:bg-bg-subtle transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal size={16} className="text-primary" />
                <span>ورود یک‌کلیکی به پنل مدیریت</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
              <span>تحویل فوری در ۲۴ ساعت</span>
              <span aria-hidden="true">·</span>
              <span>امکان اتصال به دامنه اختصاصی کافه</span>
              <span aria-hidden="true">·</span>
              <span>پشتیبانی از تم روز و شب و ۴ پالت رنگی</span>
            </div>
          </div>

          {/* Left Column: High-Impact Visual Showcase */}
          <div className="lg:col-span-5 relative min-h-[360px] rounded-3xl overflow-hidden border border-border-subtle bg-bg-surface">
            <img
              src={GENERATED_IMAGES.hero}
              alt="محیط کافه و منوی دیجیتال"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-6 right-6 left-6 text-white">
              <div className="bg-black/55 backdrop-blur-md border border-white/15 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div>
                    <p className="text-xs text-white/75 mb-0.5">پیش‌نمایش آیتم پرفروش در منو</p>
                    <h3 className="text-base font-bold">لاته آرت زعفران و گل سرخ</h3>
                  </div>
                  <span className="text-sm font-semibold tabular-nums whitespace-nowrap bg-white/15 px-3 py-1 rounded-lg">
                    ۱۴۵,۰۰۰ تومان
                  </span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  نمایش عکس‌های استودیویی با بزرگنمایی تمام‌صفحه، برچسب پیشنهاد سرآشپز و بروزرسانی آنی از پنل مدیریت.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column KPI Proof Strip Below Hero */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <p className="text-2xl md:text-3xl font-bold text-primary tabular-nums mb-1">۱۰۰٪</p>
            <p className="text-sm font-semibold text-text-main mb-1">حذف هزینه چاپ و لیبل‌گذاری</p>
            <p className="text-xs text-text-muted">تغییر نامحدود قیمت‌ها در طول سال بدون نیاز به چاپ مجدد منو</p>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <p className="text-2xl md:text-3xl font-bold text-primary tabular-nums mb-1">+۲۸٪</p>
            <p className="text-sm font-semibold text-text-main mb-1">افزایش فروش دسر و آیتم‌های ویژه</p>
            <p className="text-xs text-text-muted">هدایت هوشمند نگاه مشتری به آیتم‌های با حاشیه سود بالا</p>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <p className="text-2xl md:text-3xl font-bold text-primary tabular-nums mb-1">۵ ثانیه</p>
            <p className="text-sm font-semibold text-text-main mb-1">تغییر وضعیت «ناموجود»</p>
            <p className="text-xs text-text-muted">حذف کامل نارضایتی مشتری از سفارش آیتم‌های تمام‌شده</p>
          </div>
          <div className="bg-bg-surface border border-border-subtle rounded-2xl p-6">
            <p className="text-2xl md:text-3xl font-bold text-primary tabular-nums mb-1">۰.۸ ثانیه</p>
            <p className="text-sm font-semibold text-text-main mb-1">سرعت باز شدن روی موبایل</p>
            <p className="text-xs text-text-muted">بهینه‌سازی شده برای اینترنت سیم‌کارت بدون نیاز به فیلترشکن</p>
          </div>
        </div>
      </section>

      {/* Section 2: Core Capabilities (Bento Grid with Human Editorial Numbering) */}
      <section id="capabilities" className="max-w-7xl mx-auto px-6 py-16 border-t border-border-subtle">
        <div className="mb-12">
          <p className="text-xs font-semibold text-primary mb-2">چرا کافه‌ها و رستوران‌های پیشرو این سیستم را می‌خرند؟</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-main">
            طراحی‌شده بر اساس نیاز واقعی مدیران کافه و تجربه مشتری سر میز
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Span 2 */}
          <div className="md:col-span-2 bg-bg-surface border border-border-subtle rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-text-muted block mb-3">01. مدیریت آنی از طریق موبایل</span>
              <h3 className="text-xl font-bold text-text-main mb-3">
                ویرایش قیمت، افزودن آیتم جدید و تغییر چیدمان در چند ثانیه
              </h3>
              <p className="text-sm text-text-muted leading-relaxed mb-6">
                پنل مدیریت این محصول طوری طراحی شده که مدیر کافه یا باریستا حتی پشت بار با گوشی موبایل بتواند عکس محصول جدید را آپلود کند، قیمت‌ها را به تومان تغییر دهد، اولویت نمایش دسته‌بندی‌ها را جابجا کند یا آیتمی که تمام شده را با یک کلیک «ناموجود» کند.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border-subtle text-xs text-text-muted">
              <span>آپلود مستقیم عکس از گالری گوشی</span>
              <span>مرتب‌سازی ترتیب نمایش آیتم‌ها</span>
              <span>فیلتر و جستجوی سریع ادمین</span>
              <span>تگ «پیشنهاد ویژه سرآشپز»</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-text-muted block mb-3">02. دو حالت نمایش اختصاصی</span>
              <h3 className="text-xl font-bold text-text-main mb-3">
                نمای شبکه‌ای گالری + نمای لیستی سریع
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                مشتریان می‌توانند با یک لمس بین حالت گالری بزرگ (مناسب دیدن جزئیات کیک، برانچ و گارنیش) و حالت لیستی فشرده جابجا شوند و انتخاب آن‌ها در حافظه گوشی ذخیره می‌ماند.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-primary">
              <LayoutGrid size={16} />
              <span>ذخیره هوشمند سلیقه هر مشتری</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono text-text-muted block mb-3">03. تولیدکننده QR کد میزها</span>
              <h3 className="text-xl font-bold text-text-main mb-3">
                خروجی آماده چاپ برای استند روی میز
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                داخل خود سیستم، تولیدکننده آنی QR کد با قابلیت دانلود مستقیم قرار دارد تا برای هر شعبه یا هر میز، استند اسکن منو را بلافاصله چاپ کنید.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-primary">
              <QrCode size={16} />
              <span>بدون هزینه اشتراک ماهانه QR کد</span>
            </div>
          </div>

          {/* Card 4: Span 2 */}
          <div className="md:col-span-2 bg-bg-surface border border-border-subtle rounded-3xl p-8 flex flex-col justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <span className="text-xs font-mono text-text-muted block mb-3">04. تطبیق با هویت بصری هر کافه</span>
                <h3 className="text-xl font-bold text-text-main mb-3">
                  پالت‌های رنگی متنوع + حالت روز و شب اتوماتیک
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  چه کافه شما فضای سبز و بوتانیکال داشته باشد، چه رستوران ایتالیایی گرم یا کافه تخصصی اسپرسو؛ رنگ‌بندی سیستم دقیقاً با دکوراسیون مجموعه شما ست می‌شود.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <img
                  src={GENERATED_IMAGES.icedMatcha}
                  alt="آیس ماچا"
                  referrerPolicy="no-referrer"
                  className="w-full h-36 object-cover rounded-2xl border border-border-subtle"
                />
                <img
                  src={GENERATED_IMAGES.cheesecake}
                  alt="چیزکیک"
                  referrerPolicy="no-referrer"
                  className="w-full h-36 object-cover rounded-2xl border border-border-subtle"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive ROI & Savings Calculator for Cafe Owners */}
      <section id="roi-calculator" className="max-w-7xl mx-auto px-6 py-16 border-t border-border-subtle">
        <div className="bg-bg-surface border border-border-subtle rounded-3xl p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div>
                <p className="text-xs font-semibold text-primary mb-2">محاسبه‌گر اقتصادی ویژه مدیران کافه و رستوران</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-text-main mb-3">
                  محاسبه سود و صرفه‌جویی مجموعه شما
                </h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  مشخصات کافه یا رستوران را تنظیم کنید تا ببینید حذف چاپ منوی کاغذی و نمایش تصویری آیتم‌های ویژه چقدر به سود خالص مجموعه اضافه می‌کند:
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>تعداد میزهای کافه / رستوران</span>
                    <span className="font-bold text-primary tabular-nums">{tableCount.toLocaleString('fa-IR')} میز</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={60}
                    value={tableCount}
                    onChange={(e) => setTableCount(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>میانگین تعداد فاکتور روزانه</span>
                    <span className="font-bold text-primary tabular-nums">{dailyOrders.toLocaleString('fa-IR')} فاکتور در روز</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={400}
                    step={10}
                    value={dailyOrders}
                    onChange={(e) => setDailyOrders(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span>دفعات تغییر قیمت یا آیتم‌ها در سال</span>
                    <span className="font-bold text-primary tabular-nums">{reprintsPerYear.toLocaleString('fa-IR')} بار در سال</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={12}
                    value={reprintsPerYear}
                    onChange={(e) => setReprintsPerYear(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-bg-subtle border border-border-subtle rounded-2xl p-6">
                <p className="text-xs text-text-muted mb-2">صرفه‌جویی سالانه حذف چاپ منو</p>
                <p className="text-xl sm:text-2xl font-bold text-text-main tabular-nums mb-2">
                  {formatPrice(annualPrintSavings)}
                </p>
                <p className="text-xs text-text-muted">
                  بر اساس میانگین هزینه طراحی، چاپ و لمینت منو برای هر میز
                </p>
              </div>

              <div className="bg-bg-subtle border border-border-subtle rounded-2xl p-6">
                <p className="text-xs text-text-muted mb-2">افزایش فروش ماهانه آیتم‌های ویژه</p>
                <p className="text-xl sm:text-2xl font-bold text-primary tabular-nums mb-2">
                  {formatPrice(monthlyUpsellRevenue)}
                </p>
                <p className="text-xs text-text-muted">
                  حاصل از نمایش عکس استودیویی دسر، پیش‌غذا و نوشیدنی‌های تخصصی
                </p>
              </div>

              <div className="sm:col-span-2 bg-primary text-white rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-white/80 mb-1">مجموع منفعت مالی سالانه برآورد شده</p>
                  <p className="text-2xl sm:text-3xl font-bold tabular-nums">
                    {formatPrice(annualPrintSavings + monthlyUpsellRevenue * 12)}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="px-5 py-3 bg-white text-text-main text-xs font-bold rounded-xl hover:opacity-95 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
                >
                  تست زنده منوی نمونه
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Live Visual Sample Gallery */}
      <section id="live-showcase" className="max-w-7xl mx-auto px-6 py-16 border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold text-primary mb-2">کیفیت بصری در سطح برندهای بین‌المللی</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-text-main">
              نمونه دسته‌بندی‌ها و عکاسی داخل منوی دمو
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-bg-surface border border-border-subtle rounded-xl text-xs font-semibold hover:bg-bg-subtle transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0"
            >
              <span>باز کردن منوی کامل (۱۲ آیتم)</span>
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'بار گرم و قهوه تخصصی',
              sample: 'لاته آرت زعفران و گل سرخ',
              price: 145000,
              img: GENERATED_IMAGES.floralLatte,
            },
            {
              title: 'بار سرد و ماچا بار',
              sample: 'آیس ماچا بری لایه‌ای',
              price: 168000,
              img: GENERATED_IMAGES.icedMatcha,
            },
            {
              title: 'صبحانه و برانچ تخصصی',
              sample: 'اگز بندیکت روی نان خمیرترش',
              price: 265000,
              img: GENERATED_IMAGES.benedict,
            },
            {
              title: 'سالاد و غذای اصلی',
              sample: 'سالاد سزار با فیله مرغ گریل',
              price: 285000,
              img: GENERATED_IMAGES.caesar,
            },
          ].map((card, i) => (
            <div
              key={i}
              onClick={() => navigate('/')}
              className="bg-bg-surface border border-border-subtle rounded-3xl overflow-hidden cursor-pointer group hover:shadow-md transition-all"
            >
              <div className="aspect-[4/3] overflow-hidden bg-bg-subtle">
                <img
                  src={card.img}
                  alt={card.sample}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <p className="text-xs text-text-muted mb-1">{card.title}</p>
                <h3 className="text-base font-bold text-text-main mb-2 line-clamp-1">{card.sample}</h3>
                <p className="text-sm font-semibold text-primary tabular-nums">{formatPrice(card.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 5: Pricing Packages & Lead Capture Form */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-16 border-t border-border-subtle">
        <div className="mb-12 text-right">
          <p className="text-xs font-semibold text-primary mb-2">پکیج‌های راه‌اندازی و تحویل اختصاصی</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-main">
            سرمایه‌گذاری یک‌باره، استفاده دائمی بدون کمیسیون فروش
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {[
            {
              name: 'پکیج پایه کافه',
              price: '۴,۹۰۰,۰۰۰ تومان',
              subtitle: 'مناسب کافه‌های دنج، بیرون‌بر و قهوه‌فروشی‌ها',
              features: [
                'منوی دیجیتال دوحالته (شبکه‌ای و لیستی)',
                'پنل مدیریت کامل دسته‌بندی‌ها و محصولات',
                'تولیدکننده QR کد اختصاصی میزها',
                'حالت روز و شب (Dark / Light Mode)',
                'پشتیبانی فنی و آموزش کار با پنل',
              ],
              highlighted: false,
            },
            {
              name: 'حرفه‌ای (پیشنهاد ویژه)',
              price: '۸,۵۰۰,۰۰۰ تومان',
              subtitle: 'مناسب کافه‌رستوران‌ها و مجموعه‌های پرمخاطب',
              features: [
                'تمامی امکانات پکیج پایه بدون محدودیت آیتم',
                'شخصی‌سازی کامل رنگ‌بندی و لوگوی اختصاصی کافه',
                'اتصال به دامنه اینترنتی اختصاصی مجموعه شما',
                'ورود اولیه کل منو و بهینه‌سازی تصاویر توسط تیم ما',
                'طراحی فایل چاپی استند QR کد رومیزی اختصاصی',
              ],
              highlighted: true,
            },
            {
              name: 'پکیج VIP + عکاسی صنعتی',
              price: '۱۴,۸۰۰,۰۰۰ تومان',
              subtitle: 'تحویل صفر تا صد همراه با تولید محتوای بصری',
              features: [
                'تمامی امکانات پکیج حرفه‌ای و دامنه اختصاصی',
                'عکاسی حرفه‌ای از آیتم‌های منو در محل کافه شما',
                'ادیت رنگ و نور استودیویی عکس‌های منو',
                'سئوی محلی (Google Maps) و لینک‌های شبکه اجتماعی',
                'پشتیبانی ویژه ۱ ساله و بروزرسانی‌های رایگان',
              ],
              highlighted: false,
            },
          ].map((pkg, idx) => (
            <div
              key={idx}
              className={`rounded-3xl p-8 flex flex-col justify-between border transition-all ${
                pkg.highlighted
                  ? 'bg-bg-surface border-primary shadow-md'
                  : 'bg-bg-surface border-border-subtle'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-lg font-bold text-text-main">{pkg.name}</h3>
                  {pkg.highlighted && (
                    <span className="text-xs font-semibold text-primary">پرفروش‌ترین</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mb-6">{pkg.subtitle}</p>
                <p className="text-2xl sm:text-3xl font-bold text-text-main tabular-nums mb-6">
                  {pkg.price}
                </p>
                <ul className="space-y-3 mb-8">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-text-main">
                      <Check size={16} className="text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="#order-form"
                onClick={() => setSelectedPackage(pkg.name)}
                className={`w-full py-3.5 rounded-xl text-xs font-bold text-center transition-all whitespace-nowrap shrink-0 ${
                  pkg.highlighted
                    ? 'bg-primary text-white hover:opacity-95'
                    : 'bg-bg-subtle text-text-main border border-border-subtle hover:bg-border-subtle/40'
                }`}
              >
                انتخاب و ثبت سفارش این پکیج
              </a>
            </div>
          ))}
        </div>

        {/* Lead Capture Form */}
        <div id="order-form" className="bg-bg-surface border border-border-subtle rounded-3xl p-8 md:p-12 max-w-3xl mx-auto">
          <div className="mb-8">
            <p className="text-xs font-semibold text-primary mb-2">درخواست مشاوره و راه‌اندازی منوی دیجیتال</p>
            <h3 className="text-2xl font-bold text-text-main mb-2">
              ثبت سفارش یا رزرو جلسه پرزنت حضوری در کافه شما
            </h3>
            <p className="text-xs sm:text-sm text-text-muted">
              مشخصات مجموعه خود را وارد کنید؛ درخواست شما مستقیماً در پنل مدیریت ثبت می‌شود تا در کوتاه‌ترین زمان هماهنگی انجام شود.
            </p>
          </div>

          {submittedSuccess ? (
            <div className="bg-bg-subtle border border-border-subtle rounded-2xl p-6 text-center space-y-4">
              <p className="text-lg font-bold text-primary">
                درخواست راه‌اندازی برای «{cafeName}» با موفقیت ثبت شد!
              </p>
              <p className="text-xs sm:text-sm text-text-muted">
                اطلاعات شما در بخش درخواست‌های پنل مدیریت ذخیره شد. کارشناسان ما به‌زودی با شماره {phone} تماس می‌گیرند.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setCafeName('');
                    setOwnerName('');
                    setPhone('');
                    setCity('');
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-bg-surface border border-border-subtle rounded-xl cursor-pointer"
                >
                  ثبت درخواست جدید
                </button>
                <button
                  onClick={handleInstantAdminDemo}
                  className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-xl cursor-pointer"
                >
                  مشاهده درخواست در پنل مدیریت
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">نام کافه یا رستوران *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: کافه رستوران روبرتو"
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">نام مدیر یا مسئول هماهنگی</label>
                <input
                  type="text"
                  placeholder="مثال: علی محمدی"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">شماره موبایل تماس *</label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border-subtle text-sm text-left tabular-nums focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5">شهر / محدوده</label>
                <input
                  type="text"
                  placeholder="مثال: تهران - فرشته"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1.5">پکیج مورد نظر</label>
                <select
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-bg-base border border-border-subtle text-sm focus:outline-none focus:border-primary"
                >
                  <option value="پکیج پایه کافه">پکیج پایه کافه (۴,۹۰۰,۰۰۰ تومان)</option>
                  <option value="حرفه‌ای (پیشنهاد ویژه)">پکیج حرفه‌ای کافه‌رستوران (۸,۵۰۰,۰۰۰ تومان)</option>
                  <option value="پکیج VIP + عکاسی صنعتی">پکیج VIP + عکاسی صنعتی (۱۴,۸۰۰,۰۰۰ تومان)</option>
                </select>
              </div>
              <div className="sm:col-span-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-primary text-white font-bold text-sm rounded-xl hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'در حال ثبت درخواست...' : 'ثبت درخواست مشاوره و سفارش منوی دیجیتال'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-border-subtle py-8 px-6 text-center text-xs text-text-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>پلتفرم منوی دیجیتال و پنل مدیریت اختصاصی ویژه کافه و رستوران‌ها</span>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/')} className="hover:text-text-main cursor-pointer">
              منوی مشتری
            </button>
            <button onClick={handleInstantAdminDemo} className="hover:text-text-main cursor-pointer">
              پنل مدیریت دمو
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

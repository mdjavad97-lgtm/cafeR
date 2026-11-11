import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Image as ImageIcon, CheckCircle, XCircle, Search, ChevronRight, ChevronLeft, X, ArrowUp, ArrowDown, RotateCcw, Settings } from 'lucide-react';
import { formatPrice, resolveProductImage, GENERATED_IMAGES, BrandSettings, DEFAULT_BRAND_SETTINGS } from '../lib/utils';

type Category = { id: number; name: string; sort_order?: number };
type Product = { 
  id: number; 
  category_id: number; 
  name: string; 
  price: number; 
  image_url: string; 
  is_available: number; 
  is_special: number; 
  description?: string;
  sort_order?: number;
};

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(DEFAULT_BRAND_SETTINGS);
  const [savingBrand, setSavingBrand] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{id: number, name: string} | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: 1,
    description: '',
    price: '',
    is_special: false,
    is_available: true,
    sort_order: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    fetch(`${import.meta.env.BASE_URL}api/products`).then(r => r.json()).then(setProducts);
    fetch(`${import.meta.env.BASE_URL}api/categories`).then(r => r.json()).then(setCategories);
    fetch(`${import.meta.env.BASE_URL}api/settings`)
      .then(r => r.json())
      .then(data => {
        if (data && data.cafe_name) {
          setBrandSettings({ ...DEFAULT_BRAND_SETTINGS, ...data });
        }
      })
      .catch(() => {});
  };

  const handleBrandImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'hero_url') => {
    if (!e.target.files || !e.target.files[0]) return;
    const fData = new FormData();
    fData.append('image', e.target.files[0]);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/upload`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('admin_token') },
        body: fData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setBrandSettings(prev => ({ ...prev, [field]: data.url }));
        toast.success(field === 'logo_url' ? 'لوگوی کافه آپلود شد' : 'تصویر بنر هدر آپلود شد');
      } else {
        toast.error(data.error || 'خطا در آپلود تصویر');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور آپلود');
    }
  };

  const handleSaveBrandSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandSettings.cafe_name.trim()) {
      return toast.error('لطفاً نام کافه یا رستوران را وارد کنید');
    }
    setSavingBrand(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('admin_token'),
        },
        body: JSON.stringify(brandSettings),
      });
      if (res.ok) {
        localStorage.setItem('brand_theme', brandSettings.brand_theme);
        document.title = `${brandSettings.cafe_name} | پنل مدیریت`;
        toast.success('تنظیمات نام، لوگو و برند کافه با موفقیت ذخیره شد');
        setIsEditingBrand(false);
        window.dispatchEvent(new Event('brand-settings-updated'));
      } else {
        toast.error('خطا در ذخیره تنظیمات برند');
      }
    } catch {
      toast.error('خطای شبکه');
    } finally {
      setSavingBrand(false);
    }
  };

  const handleResetDemoCatalog = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/demo/seed`, { method: 'POST' });
      if (res.ok) {
        toast.success('منوی نمونه ۱۲ آیتمی با عکس‌های استودیویی بازنشانی شد');
        fetchData();
      } else {
        toast.error('خطا در بازنشانی منوی نمونه');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setEditingProductId(null);
    setFormData({ name: '', category_id: categories[0]?.id || 1, description: '', price: '', is_special: false, is_available: true, sort_order: 0 });
    setFile(null);
    setPreview(null);
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return toast.error('لطفا نام دسته‌بندی را بنویسید');
    
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('admin_token') },
        body: JSON.stringify({ name: newCategoryName, sort_order: categories.length + 1 })
      });
      if (res.ok) {
        toast.success('دسته‌بندی با موفقیت ساخته شد');
        setIsAddingCategory(false);
        setNewCategoryName('');
        fetchData();
      } else {
        toast.error('خطا در ساخت دسته‌بندی');
      }
    } catch {
      toast.error('خطای شبکه');
    }
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name) return toast.error('نام دسته‌بندی نمی‌تواند خالی باشد');
    
    // Find original category properties to keep sort_order
    const originalCat = categories.find(c => c.id === editingCategory.id);
    const sortOrder = originalCat ? (originalCat.sort_order ?? 1) : 1;
    
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('admin_token') },
        body: JSON.stringify({ name: editingCategory.name, sort_order: sortOrder })
      });
      if (res.ok) {
        toast.success('دسته‌بندی با موفقیت ویرایش شد');
        setEditingCategory(null);
        fetchData();
      } else {
        toast.error('خطا در ویرایش دسته‌بندی');
      }
    } catch {
      toast.error('خطای شبکه');
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    
    const newCategories = [...categories];
    const temp = newCategories[index];
    newCategories[index] = newCategories[targetIndex];
    newCategories[targetIndex] = temp;
    
    // Re-assign sequential sort_orders
    const updatedCategories = newCategories.map((cat, idx) => ({
      ...cat,
      sort_order: idx + 1
    }));
    
    // Optimistic UI update
    setCategories(updatedCategories);
    
    try {
      const token = localStorage.getItem('admin_token');
      const item1 = updatedCategories[index];
      const item2 = updatedCategories[targetIndex];
      
      const res1 = await fetch(`${import.meta.env.BASE_URL}api/categories/${item1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ name: item1.name, sort_order: item1.sort_order })
      });
      
      const res2 = await fetch(`${import.meta.env.BASE_URL}api/categories/${item2.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ name: item2.name, sort_order: item2.sort_order })
      });
      
      if (!res1.ok || !res2.ok) {
        toast.error('خطا در ذخیره ترتیب جدید');
        fetchData();
      } else {
        toast.success('ترتیب دسته‌بندی‌ها تغییر یافت');
      }
    } catch {
      toast.error('خطای اتصال در تغییر ترتیب');
      fetchData();
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if(!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟ تمام محصولات این دسته بدون دسته خواهند شد.')) return;
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + localStorage.getItem('admin_token') }
      });
      if (res.ok) {
        toast.success('دسته‌بندی حذف شد');
        fetchData();
      } else {
        toast.error('خطا در حذف دسته‌بندی');
      }
    } catch {
      toast.error('خطای شبکه');
    }
  };

  const handleEditClick = (product: Product) => {
    setIsAdding(true);
    setEditingProductId(product.id);
    setFormData({
      name: product.name,
      category_id: product.category_id,
      description: product.description || '',
      price: product.price.toString(),
      is_special: product.is_special === 1,
      is_available: product.is_available === 1,
      sort_order: product.sort_order ?? 0
    });
    setPreview(product.image_url || null);
    setFile(null);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if(!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;
    const res = await fetch(`${import.meta.env.BASE_URL}api/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + localStorage.getItem('admin_token') }
    });
    if (res.ok) {
      toast.success('محصول با موفقیت حذف شد');
      fetchData();
    } else {
      toast.error('خطا در حذف محصول');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.category_id) {
      toast.error('لطفا فیلدهای ضروری را پر کنید');
      return;
    }

    let image_url = preview || ''; // Keep old preview URL if no new file is selected
    
    // 1. Upload File
    if (file) {
      const fData = new FormData();
      fData.append('image', file);
      try {
        const uploadRes = await fetch(`${import.meta.env.BASE_URL}api/upload`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + localStorage.getItem('admin_token') },
          body: fData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) {
          image_url = uploadData.url;
        } else {
          toast.error(uploadData.error || 'خطا در آپلود عکس');
          return;
        }
      } catch {
        toast.error('خطا در ارتباط با سرور آپلود');
        return;
      }
    }

    // 2. Save/Update Product
    try {
      const url = editingProductId ? `${import.meta.env.BASE_URL}api/products/${editingProductId}` : `${import.meta.env.BASE_URL}api/products`;
      const method = editingProductId ? 'PUT' : 'POST';
      
      const pRes = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + localStorage.getItem('admin_token')
        },
        body: JSON.stringify({
          ...formData,
          price: parseInt(formData.price),
          image_url
        })
      });
      if (pRes.ok) {
        toast.success(editingProductId ? 'محصول با موفقیت ویرایش شد' : 'محصول با موفقیت اضافه شد');
        resetForm();
        fetchData();
      } else {
        toast.error('خطا در ثبت محصول');
      }
    } catch {
      toast.error('خطای شبکه');
    }
  };

  const handleMoveProduct = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredProducts.length) return;
    
    const newFilteredProducts = [...filteredProducts];
    const temp = newFilteredProducts[index];
    newFilteredProducts[index] = newFilteredProducts[targetIndex];
    newFilteredProducts[targetIndex] = temp;
    
    // Assign sequential sort_order to each product in this category
    const updatedCategoryProducts = newFilteredProducts.map((p, idx) => ({
      ...p,
      sort_order: idx + 1
    }));
    
    // Optimistic UI update:
    const updatedProducts = products.map(p => {
      const updated = updatedCategoryProducts.find(uc => uc.id === p.id);
      return updated ? updated : p;
    });
    
    const sortedProducts = [...updatedProducts].sort((a, b) => {
      const orderA = a.sort_order ?? 0;
      const orderB = b.sort_order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return b.id - a.id;
    });
    
    setProducts(sortedProducts);
    
    try {
      const token = localStorage.getItem('admin_token');
      const item1 = updatedCategoryProducts[index];
      const item2 = updatedCategoryProducts[targetIndex];
      
      const res1 = await fetch(`${import.meta.env.BASE_URL}api/products/${item1.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          category_id: item1.category_id,
          name: item1.name,
          description: item1.description || '',
          price: item1.price,
          image_url: item1.image_url,
          is_available: item1.is_available === 1,
          is_special: item1.is_special === 1,
          sort_order: item1.sort_order
        })
      });
      
      const res2 = await fetch(`${import.meta.env.BASE_URL}api/products/${item2.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          category_id: item2.category_id,
          name: item2.name,
          description: item2.description || '',
          price: item2.price,
          image_url: item2.image_url,
          is_available: item2.is_available === 1,
          is_special: item2.is_special === 1,
          sort_order: item2.sort_order
        })
      });
      
      if (!res1.ok || !res2.ok) {
        toast.error('خطا در ذخیره ترتیب جدید محصولات');
        fetchData();
      } else {
        toast.success('ترتیب محصول با موفقیت تغییر یافت');
      }
    } catch {
      toast.error('خطای اتصال در تغییر ترتیب');
      fetchData();
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCategoryId]);

  const filteredProducts = products.filter(p => {
    // Filter by Category
    if (filterCategoryId !== 'all' && p.category_id !== filterCategoryId) {
      return false;
    }
    
    // Filter by Search Query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || 
           (p.description && p.description.toLowerCase().includes(query));
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <div className="text-right">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">
            مدیریت منو — {brandSettings.cafe_name}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">تغییرات نام برند، لوگو، قیمت‌ها و محصولات بلافاصله در منوی دیجیتال اعمال می‌شود</p>
        </div>
        {!isAdding && !isAddingCategory && !isManagingCategories && !isEditingBrand && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsEditingBrand(true)}
              className="flex items-center gap-1.5 bg-gray-900 text-white px-3.5 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm whitespace-nowrap font-medium hover:bg-gray-800 transition-all cursor-pointer shadow-sm"
            >
              <Settings size={16} />
              تنظیمات برند و لوگو
            </button>
            <button
              onClick={handleResetDemoCatalog}
              className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs whitespace-nowrap font-medium hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
              title="بازگردانی ۱۲ آیتم نمونه با عکس‌های حرفه‌ای برای پرزنت به مشتری جدید"
            >
              <RotateCcw size={15} />
              بازنشانی منوی دمو
            </button>
            <button 
              onClick={() => setIsManagingCategories(true)}
              className="flex items-center gap-1 md:gap-2 bg-gray-100 text-gray-700 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm whitespace-nowrap font-medium hover:bg-gray-200 border border-gray-200 transition-all cursor-pointer"
            >
              مدیریت دسته‌ها
            </button>
            <button 
              onClick={() => setIsAddingCategory(true)}
              className="flex items-center gap-1 md:gap-2 bg-blue-500 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm whitespace-nowrap font-medium hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
            >
              <Plus size={16} className="md:w-[18px] md:h-[18px]" />
              دسته‌بندی جدید
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1 md:gap-2 bg-primary text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm whitespace-nowrap font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Plus size={16} className="md:w-[18px] md:h-[18px]" />
              محصول جدید
            </button>
          </div>
        )}
      </div>

      {isEditingBrand && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-3xl">
          <div className="flex items-center justify-between mb-6 border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">تنظیمات هویت بصری، نام و لوگوی کافه / رستوران</h2>
              <p className="text-xs text-gray-500 mt-1">
                هر کافه یا رستوران می‌تواند نام، لوگو، بنر هدر، ساعت کاری و پالت رنگی اختصاصی خود را در این بخش تنظیم کند.
              </p>
            </div>
            <button onClick={() => setIsEditingBrand(false)} className="text-gray-500 hover:text-gray-800 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSaveBrandSettings} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">نام کافه یا رستوران *</label>
                <input
                  type="text"
                  required
                  value={brandSettings.cafe_name}
                  onChange={e => setBrandSettings({ ...brandSettings, cafe_name: e.target.value })}
                  placeholder="مثال: کافه رستوران روبرتو"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">زیرعنوان انگلیسی / لاتین</label>
                <input
                  type="text"
                  dir="ltr"
                  value={brandSettings.cafe_en_name}
                  onChange={e => setBrandSettings({ ...brandSettings, cafe_en_name: e.target.value })}
                  placeholder="SPECIALTY CAFE & KITCHEN"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">شعار یا توضیح کوتاه بالای منو</label>
                <input
                  type="text"
                  value={brandSettings.cafe_subtitle}
                  onChange={e => setBrandSettings({ ...brandSettings, cafe_subtitle: e.target.value })}
                  placeholder="مثال: قهوه تخصصی، نان و شیرینی روزانه و آشپزخانه مدیترانه‌ای"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">ساعت کاری مجموعه</label>
                <input
                  type="text"
                  value={brandSettings.working_hours}
                  onChange={e => setBrandSettings({ ...brandSettings, working_hours: e.target.value })}
                  placeholder="مثال: ساعت کاری ۸ صبح تا ۱۱ شب"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">توضیح سرویس / وای‌فای</label>
                <input
                  type="text"
                  value={brandSettings.wifi_info}
                  onChange={e => setBrandSettings({ ...brandSettings, wifi_info: e.target.value })}
                  placeholder="مثال: اینترنت رایگان مهمان"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Logo & Hero Banner Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-800 mb-1">لوگوی اختصاصی کافه</p>
                  <p className="text-[11px] text-gray-500 mb-2">نمایش در بالای منو و کشوی موبایل (PNG / JPG / WebP)</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 cursor-pointer"
                    >
                      آپلود لوگو
                    </button>
                    {brandSettings.logo_url && (
                      <button
                        type="button"
                        onClick={() => setBrandSettings({ ...brandSettings, logo_url: '' })}
                        className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs cursor-pointer"
                      >
                        حذف لوگو
                      </button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleBrandImageUpload(e, 'logo_url')}
                  />
                </div>
                {brandSettings.logo_url ? (
                  <img
                    src={brandSettings.logo_url.startsWith('http') ? brandSettings.logo_url : `${import.meta.env.BASE_URL}${brandSettings.logo_url.replace(/^\//, '')}`}
                    alt="Logo"
                    className="w-16 h-16 rounded-xl object-contain bg-white border border-gray-200 p-1 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-white border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 text-center p-1 shrink-0">
                    آیکون پیش‌فرض
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-800 mb-1">تصویر بنر بالای منو (Hero)</p>
                  <p className="text-[11px] text-gray-500 mb-2">عکس فضای داخلی یا میز کافه شما</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => heroInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-100 cursor-pointer"
                    >
                      آپلود بنر جدید
                    </button>
                    {brandSettings.hero_url !== GENERATED_IMAGES.hero && (
                      <button
                        type="button"
                        onClick={() => setBrandSettings({ ...brandSettings, hero_url: GENERATED_IMAGES.hero })}
                        className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg text-xs cursor-pointer"
                      >
                        بنر پیش‌فرض
                      </button>
                    )}
                  </div>
                  <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleBrandImageUpload(e, 'hero_url')}
                  />
                </div>
                <img
                  src={
                    brandSettings.hero_url?.startsWith('http') || brandSettings.hero_url?.startsWith('/src/assets/')
                      ? brandSettings.hero_url
                      : `${import.meta.env.BASE_URL}${(brandSettings.hero_url || GENERATED_IMAGES.hero).replace(/^\//, '')}`
                  }
                  alt="Hero"
                  className="w-20 h-16 rounded-xl object-cover bg-white border border-gray-200 shrink-0"
                />
              </div>
            </div>

            {/* Color Palette Selector */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 mb-2">پالت رنگی پیش‌فرض منوی کافه</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'botanical', label: 'سبز بوتانیکال', color: '#5B6346' },
                  { id: 'espresso', label: 'اسپرسو کلاسیک', color: '#6F4E37' },
                  { id: 'terracotta', label: 'رستوران ایتالیایی', color: '#9E4733' },
                  { id: 'royal', label: 'سرمه‌ای لوکس', color: '#1E3A5F' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBrandSettings({ ...brandSettings, brand_theme: t.id as BrandSettings['brand_theme'] })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium flex items-center gap-2 border transition-all cursor-pointer ${
                      brandSettings.brand_theme === t.id
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditingBrand(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={savingBrand}
                className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {savingBrand ? 'در حال ذخیره...' : 'ذخیره تنظیمات برند کافه'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isManagingCategories && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-2xl">
          <div className="flex items-center justify-between mb-6 border-b pb-3">
            <h2 className="text-lg font-bold">مدیریت دسته‌بندی‌ها</h2>
            <button onClick={() => setIsManagingCategories(false)} className="text-gray-500 hover:text-gray-800">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pl-2">
            {categories.map((c, index) => (
              <div key={c.id} className="flex flex-col md:flex-row md:items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200 gap-3">
                {editingCategory?.id === c.id ? (
                  <form onSubmit={handleEditCategorySubmit} className="flex-1 flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editingCategory.name} 
                      onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                      className="flex-1 px-3 py-1.5 border rounded-lg focus:ring-primary focus:border-primary text-sm"
                      autoFocus
                      required
                    />
                    <button type="submit" className="text-green-600 bg-green-50 p-1.5 rounded-lg hover:bg-green-100"><CheckCircle size={18} /></button>
                    <button type="button" onClick={() => setEditingCategory(null)} className="text-gray-500 bg-gray-100 p-1.5 rounded-lg hover:bg-gray-200"><XCircle size={18} /></button>
                  </form>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <button 
                          onClick={() => handleMoveCategory(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                          title="انتقال به بالا"
                        >
                          <ArrowUp size={14} className="text-gray-600" />
                        </button>
                        <button 
                          onClick={() => handleMoveCategory(index, 'down')}
                          disabled={index === categories.length - 1}
                          className="p-1 hover:bg-gray-200 rounded disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                          title="انتقال به پایین"
                        >
                          <ArrowDown size={14} className="text-gray-600" />
                        </button>
                      </div>
                      <span className="font-medium text-gray-800">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-2 self-end md:self-auto">
                      <button onClick={() => setEditingCategory({id: c.id, name: c.name})} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {categories.length === 0 && <div className="text-center text-gray-500 py-4">دسته‌بندی یافت نشد</div>}
          </div>
        </div>
      )}

      {isAddingCategory && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-xl">
          <h2 className="text-lg font-bold mb-6 border-b pb-3">افزودن دسته‌بندی جدید</h2>
          <form onSubmit={handleAddCategorySubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نام دسته‌بندی *</label>
              <input value={newCategoryName} onChange={e=>setNewCategoryName(e.target.value)} type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-primary focus:border-primary" required placeholder="مثال: نوشیدنی گرم" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition shadow-lg shadow-blue-500/20">ثبت دسته‌بندی</button>
            </div>
          </form>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 max-w-3xl">
          <h2 className="text-lg font-bold mb-6 border-b pb-3">{editingProductId ? 'ویرایش محصول' : 'افزودن محصول جدید'}</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نام محصول *</label>
                <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} type="text" className="w-full px-4 py-2 border rounded-lg focus:ring-primary focus:border-primary" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">قیمت (تومان) *</label>
                <input value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} type="number" dir="ltr" className="w-full px-4 py-2 border rounded-lg focus:ring-primary focus:border-primary text-left" required />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">توضیحات</label>
                <textarea value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-primary focus:border-primary" rows={3}></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">دسته‌بندی *</label>
                <select value={formData.category_id} onChange={e=>setFormData({...formData, category_id: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg focus:ring-primary focus:border-primary">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_special} onChange={e=>setFormData({...formData, is_special: e.target.checked})} className="rounded text-primary focus:ring-primary h-5 w-5" />
                  <span className="text-sm font-medium text-gray-700">محصول ویژه (Special)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_available} onChange={e=>setFormData({...formData, is_available: e.target.checked})} className="rounded text-primary focus:ring-primary h-5 w-5" />
                  <span className="text-sm font-medium text-gray-700">موجود است</span>
                </label>
              </div>
            </div>

            <div className="mt-6 border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
              {preview ? (
                <div className="relative inline-block">
                  <img src={preview.startsWith('data:') || preview.startsWith('blob:') || preview.startsWith('http') ? preview : `${import.meta.env.BASE_URL}${preview.replace(/^\//, '')}`} alt="Preview" className="h-32 object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                     <ImageIcon className="text-white mb-2" size={24} />
                     <span className="text-white text-xs">تغییر تصویر</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4">
                  <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">برای آپلود تصویر کلیک کنید (Drag & Drop)</p>
                  <p className="text-xs text-gray-400 mt-1">فرمت‌های مجاز: JPG, PNG, WEBP</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={resetForm} className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition">انصراف</button>
              <button type="submit" className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium transition shadow-lg shadow-primary/20">{editingProductId ? 'ثبت تغییرات' : 'ثبت لیست محصول'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Responsive table wrapper */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between bg-gray-50/50 gap-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full max-w-2xl">
            <div className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="جستجوی محصول (نام یا توضیحات)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-10 pr-10 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm"
                dir="rtl"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 hover:text-gray-600 transition-colors"
                    title="پاک کردن جستجو"
                  >
                    <X size={16} />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            <div className="w-full md:w-56">
              <select
                value={filterCategoryId}
                onChange={(e) => {
                  const val = e.target.value;
                  setFilterCategoryId(val === 'all' ? 'all' : parseInt(val));
                }}
                className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                dir="rtl"
              >
                <option value="all">همه دسته‌بندی‌ها</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
            تعداد کل: {filteredProducts.length} محصول
          </div>
        </div>

        {filterCategoryId === 'all' && (
          <div className="p-3 bg-blue-50/50 border-b border-blue-100 text-xs text-blue-700 text-right pr-4 font-medium" dir="rtl">
            💡 برای تغییر چیدمان و اولویت نمایش محصولات، ابتدا از منوی بالا یک دسته‌بندی خاص انتخاب کنید.
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-right min-w-[500px]" dir="rtl">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-xs md:text-sm text-gray-500 whitespace-nowrap">
              <tr>
                <th className="px-4 md:px-6 py-4 font-medium rounded-tr-2xl">تصویر</th>
                <th className="px-4 md:px-6 py-4 font-medium">نام محصول</th>
                <th className="px-4 md:px-6 py-4 font-medium">قیمت</th>
                <th className="px-4 md:px-6 py-4 font-medium">وضعیت</th>
                <th className="px-4 md:px-6 py-4 font-medium rounded-tl-2xl">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs md:text-sm">
              <AnimatePresence mode="popLayout">
                {paginatedProducts.map(p => (
                  <motion.tr 
                    key={p.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 md:px-6 py-3">
                      <img
                        src={resolveProductImage(p.image_url, p.name, p.category_id)}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = GENERATED_IMAGES.floralLatte;
                        }}
                        className="w-11 h-11 md:w-13 md:h-13 rounded-xl object-cover border border-gray-200"
                      />
                    </td>
                    <td className="px-4 md:px-6 py-3">
                      <p className="font-semibold text-gray-800">{p.name}</p>
                      {p.is_special === 1 && <span className="text-[9px] md:text-[10px] bg-secondary/20 text-red-600 px-2 py-0.5 rounded-full inline-block mt-1">ویژه</span>}
                    </td>
                    <td className="px-4 md:px-6 py-3 font-poppins font-medium text-primary whitespace-nowrap">
                      {formatPrice(p.price)}
                    </td>
                    <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                      {p.is_available === 1 ? 
                        <span className="flex items-center gap-1 text-green-600 text-[10px] md:text-xs font-medium"><CheckCircle size={12} className="md:w-[14px] md:h-[14px]"/> موجود</span> : 
                        <span className="flex items-center gap-1 text-red-500 text-[10px] md:text-xs font-medium"><XCircle size={12} className="md:w-[14px] md:h-[14px]"/> ناموجود</span>
                      }
                    </td>
                    <td className="px-4 md:px-6 py-3 border-r border-gray-100/50 h-full">
                      <div className="flex items-center gap-1 md:gap-2">
                        {filterCategoryId !== 'all' && !searchQuery.trim() && (
                          <div className="flex items-center gap-1 ml-2 border-l pl-2 border-gray-200" dir="ltr">
                            <button 
                              onClick={() => {
                                const idx = filteredProducts.findIndex(item => item.id === p.id);
                                handleMoveProduct(idx, 'up');
                              }}
                              disabled={filteredProducts.findIndex(item => item.id === p.id) === 0}
                              className="p-1 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                              title="انتقال به بالا"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button 
                              onClick={() => {
                                const idx = filteredProducts.findIndex(item => item.id === p.id);
                                handleMoveProduct(idx, 'down');
                              }}
                              disabled={filteredProducts.findIndex(item => item.id === p.id) === filteredProducts.length - 1}
                              className="p-1 hover:bg-gray-100 text-gray-500 rounded disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                              title="انتقال به پایین"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        )}
                        <button onClick={() => handleEditClick(p)} className="p-1.5 md:p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="ویرایش">
                          <Edit2 size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 md:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="حذف">
                          <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {paginatedProducts.length === 0 && (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan={5} className="py-12 text-center text-gray-400">هیچ محصولی یافت نشد.</td>
                  </motion.tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Admin Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 p-4 border-t border-gray-100 bg-gray-50/30">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            
            <div className="flex items-center gap-1" dir="ltr">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                    currentPage === i + 1
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

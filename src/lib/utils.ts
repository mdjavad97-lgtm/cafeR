import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const GENERATED_IMAGES = {
  hero: '/uploads/cafe-hero.webp',
  floralLatte: '/uploads/item-floral-latte.webp',
  icedMatcha: '/uploads/item-iced-matcha.webp',
  cheesecake: '/uploads/item-berry-cheesecake.webp',
  benedict: '/uploads/item-eggs-benedict.webp',
  caesar: '/uploads/item-caesar-salad.webp',
};

export interface BrandSettings {
  cafe_name: string;
  cafe_en_name: string;
  cafe_subtitle: string;
  logo_url: string;
  hero_url: string;
  working_hours: string;
  service_note: string;
  wifi_info: string;
  brand_theme: 'botanical' | 'espresso' | 'terracotta' | 'royal';
  footer_text: string;
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  cafe_name: 'کافه و رستوران تخصصی',
  cafe_en_name: 'SPECIALTY CAFE & KITCHEN',
  cafe_subtitle: 'قهوه تخصصی، نان و شیرینی روزانه و آشپزخانه مدیترانه‌ای',
  logo_url: '',
  hero_url: GENERATED_IMAGES.hero,
  working_hours: 'ساعت کاری ۸ صبح تا ۱۱ شب',
  service_note: 'امکان سفارش سر میز',
  wifi_info: 'اینترنت رایگان مهمان',
  brand_theme: 'botanical',
  footer_text: 'پلتفرم منوی دیجیتال هوشمند کافه و رستوران',
};

/**
 * Utility to smartly merge Tailwind utility classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price in Toman using Persian numerals
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

/**
 * Format price numeric value only in Persian numerals (for separated unit styling)
 */
export function formatPriceNumber(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price);
}

/**
 * Resolve product image with smart category-aware fallback to generated studio photography
 */
export function resolveProductImage(imageUrl?: string | null, name = '', categoryId = 1): string {
  if (imageUrl && imageUrl.trim() !== '') {
    if (imageUrl.startsWith('http') || imageUrl.startsWith('/src/assets/')) {
      return imageUrl;
    }
    return `${import.meta.env.BASE_URL}${imageUrl.replace(/^\//, '')}`;
  }
  const lower = name.toLowerCase();
  if (lower.includes('چیزکیک') || lower.includes('کیک') || lower.includes('دسر') || categoryId === 3) {
    return GENERATED_IMAGES.cheesecake;
  }
  if (lower.includes('آیس') || lower.includes('ماچا') || lower.includes('سرد') || lower.includes('مووهیتو') || categoryId === 2) {
    return GENERATED_IMAGES.icedMatcha;
  }
  if (lower.includes('صبحانه') || lower.includes('بندیکت') || lower.includes('نیمرو') || categoryId === 4) {
    return GENERATED_IMAGES.benedict;
  }
  if (lower.includes('سالاد') || lower.includes('سزار') || lower.includes('پروتئین') || categoryId === 5) {
    return GENERATED_IMAGES.caesar;
  }
  return GENERATED_IMAGES.floralLatte;
}


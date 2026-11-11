import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export const GENERATED_IMAGES = {
  hero: '/src/assets/images/cafe_hero_banner_1794390473291.jpg',
  floralLatte: '/src/assets/images/item_floral_latte_1794390474608.jpg',
  icedMatcha: '/src/assets/images/item_iced_matcha_berry_1794390474943.jpg',
  cheesecake: '/src/assets/images/item_berry_cheesecake_1794390477450.jpg',
  benedict: '/src/assets/images/item_eggs_benedict_1794390478546.jpg',
  caesar: '/src/assets/images/item_caesar_salad_1794390478362.jpg',
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


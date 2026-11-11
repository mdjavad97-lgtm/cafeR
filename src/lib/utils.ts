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
  enable_table_calls?: boolean;
  notification_provider?: 'telegram' | 'bale' | 'webhook';
  notification_bot_token?: string;
  notification_chat_id?: string;
  notification_webhook_url?: string;
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
  enable_table_calls: true,
  notification_provider: 'telegram',
  notification_bot_token: '',
  notification_chat_id: '',
  notification_webhook_url: '',
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
 * Resolve product image URL (returns empty string if image was deleted so no orphan/fallback image is shown)
 */
export function resolveProductImage(imageUrl?: string | null, _name = '', _categoryId = 1): string {
  if (!imageUrl || imageUrl.trim() === '') {
    return '';
  }
  const trimmed = imageUrl.trim();
  if (trimmed.startsWith('http') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }
  return `${import.meta.env.BASE_URL}${trimmed.replace(/^\//, '')}`;
}

/**
 * Automatically resizes (max 1080px) and converts any selected image (JPG/PNG/etc.) to compressed WebP in the browser before upload
 */
export async function convertImageFileToWebP(
  inputFile: File,
  maxDimension = 1080,
  quality = 0.82
): Promise<{ file: File; originalSize: number; compressedSize: number }> {
  const originalSize = inputFile.size;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(inputFile);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve({ file: inputFile, originalSize, compressedSize: originalSize });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ file: inputFile, originalSize, compressedSize: originalSize });
            return;
          }
          const baseName = inputFile.name.replace(/\.[^/.]+$/, '') || 'product-image';
          const webpFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve({
            file: webpFile,
            originalSize,
            compressedSize: webpFile.size,
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ file: inputFile, originalSize, compressedSize: originalSize });
    };

    img.src = objectUrl;
  });
}



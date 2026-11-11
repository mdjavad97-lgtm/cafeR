<?php
// ===== SECURE IMAGE PROCESSING, AUTO-WEBP COMPRESSION & GARBAGE COLLECTION SERVICE =====
// اعتبارسنجی بایت‌های جادویی تصویر، تبدیل خودکار به WebP کم‌حجم و حذف فیزیکی فایل‌های بلااستفاده از سرور

declare(strict_types=1);

class ImageService {
    private const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB input limit
    private const MAX_DIMENSION = 1080;
    private const WEBP_QUALITY  = 82;

    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    /**
     * Processes an uploaded image, strips metadata, resizes to max 1080px, and converts automatically to WebP
     */
    public static function processAndSaveUpload(array $file, string $uploadDir): string {
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('خطا در دریافت فایل آپلودی');
        }

        if ($file['size'] > self::MAX_FILE_SIZE) {
            throw new \RuntimeException('حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد');
        }

        // 1. بررسی واقعی MIME از محتوای باینری فایل (غیرقابل دور زدن با تغییر پسوند)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = strtolower((string) $finfo->file($file['tmp_name']));
        if (!in_array($realMime, self::ALLOWED_MIMES, true)) {
            throw new \RuntimeException('فرمت فایل معتبر نیست؛ فقط تصاویر استاندارد (JPG, PNG, WebP) مجاز هستند');
        }

        // 2. بررسی ابعاد واقعی تصویر
        $imgInfo = @getimagesize($file['tmp_name']);
        if ($imgInfo === false || $imgInfo[0] < 10 || $imgInfo[1] < 10) {
            throw new \RuntimeException('ساختار فایل تصویری معتبر نیست');
        }

        [$origWidth, $origHeight] = $imgInfo;

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = sprintf('img-%d-%s.webp', time(), bin2hex(random_bytes(6)));
        $targetPath = rtrim($uploadDir, '/') . '/' . $filename;

        // 3. اگر مرورگر قبلاً تصویر را به WebP استاندارد تبدیل کرده و سرور فاقد تابع imagecreatefromwebp باشد
        if ($realMime === 'image/webp' && !function_exists('imagecreatefromwebp')) {
            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                throw new \RuntimeException('خطا در ذخیره‌سازی فایل WebP');
            }
            return '/uploads/' . $filename;
        }

        // 4. بازسازی تصویر در حافظه با GD (حذف کامل هرگونه کد مخرب یا متادیتای EXIF اضافی)
        $srcImage = match ($realMime) {
            'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($file['tmp_name']),
            'image/png'               => @imagecreatefrompng($file['tmp_name']),
            'image/webp'              => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($file['tmp_name']) : false,
            'image/gif'               => @imagecreatefromgif($file['tmp_name']),
            default                   => false,
        };

        if (!$srcImage) {
            throw new \RuntimeException('امکان پردازش تصویر در سرور وجود ندارد');
        }

        // 5. محاسبه ابعاد جدید (حداکثر ۱۰۸۰ پیکسل برای بهینه‌سازی سرعت اینترنت موبایل)
        $newWidth = $origWidth;
        $newHeight = $origHeight;
        if ($origWidth > self::MAX_DIMENSION || $origHeight > self::MAX_DIMENSION) {
            $ratio = min(self::MAX_DIMENSION / $origWidth, self::MAX_DIMENSION / $origHeight);
            $newWidth = max(1, (int) round($origWidth * $ratio));
            $newHeight = max(1, (int) round($origHeight * $ratio));
        }

        $canvas = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 255, 255, 255, 127);
        imagefilledrectangle($canvas, 0, 0, $newWidth, $newHeight, $transparent);

        imagecopyresampled($canvas, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

        // 6. ذخیره خروجی نهایی به فرمت فشرده WebP
        if (function_exists('imagewebp')) {
            $saved = imagewebp($canvas, $targetPath, self::WEBP_QUALITY);
        } elseif ($realMime === 'image/webp') {
            $saved = copy($file['tmp_name'], $targetPath);
        } else {
            $filename = sprintf('img-%d-%s.jpg', time(), bin2hex(random_bytes(6)));
            $targetPath = rtrim($uploadDir, '/') . '/' . $filename;
            $saved = imagejpeg($canvas, $targetPath, self::WEBP_QUALITY);
        }

        imagedestroy($srcImage);
        imagedestroy($canvas);

        if (!$saved) {
            throw new \RuntimeException('خطا در ذخیره‌سازی تصویر WebP بهینه‌شده');
        }

        return '/uploads/' . $filename;
    }

    /**
     * Safely deletes a physical image file from /uploads/ if no other DB record references it
     */
    public static function deletePhysicalImageIfUnused(\PDO $pdo, ?string $imageUrl, string $uploadDir): bool {
        if (!$imageUrl || trim($imageUrl) === '') {
            return false;
        }

        $normalized = trim($imageUrl);
        if (!str_contains($normalized, '/uploads/')) {
            return false;
        }

        $filename = basename(parse_url($normalized, PHP_URL_PATH) ?: $normalized);
        if ($filename === '' || $filename === '.' || $filename === '..' || $filename === '.htaccess') {
            return false;
        }

        $cleanRelative = '/uploads/' . $filename;

        // Check if any product still references this image
        $stmtProd = $pdo->prepare('SELECT COUNT(*) FROM products WHERE image_url = ? OR image_url LIKE ?');
        $stmtProd->execute([$cleanRelative, '%' . $filename]);
        $prodCount = (int) $stmtProd->fetchColumn();
        if ($prodCount > 0) {
            return false;
        }

        // Check if brand settings (logo_url / hero_url) still reference this image
        $stmtSet = $pdo->prepare('SELECT value FROM settings WHERE `key` = ? LIMIT 1');
        $stmtSet->execute(['brand_config']);
        $row = $stmtSet->fetch();
        if ($row && !empty($row['value']) && str_contains((string) $row['value'], $filename)) {
            return false;
        }

        $fullPath = rtrim($uploadDir, '/') . '/' . $filename;
        if (is_file($fullPath)) {
            return @unlink($fullPath);
        }

        return false;
    }
}

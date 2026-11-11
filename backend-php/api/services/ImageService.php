<?php
// ===== SECURE IMAGE PROCESSING & WEBP COMPRESSION SERVICE =====
// اعتبارسنجی بایت‌های جادویی تصویر (جلوگیری از آپلود شل)، تغییر سایز خودکار و تبدیل به WebP کم‌حجم

declare(strict_types=1);

class ImageService {
    private const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
    private const MAX_DIMENSION = 1080;
    private const WEBP_QUALITY  = 82;

    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    public static function processAndSaveUpload(array $file, string $uploadDir): string {
        if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
            throw new \RuntimeException('خطا در دریافت فایل آپلودی');
        }

        if ($file['size'] > self::MAX_FILE_SIZE) {
            throw new \RuntimeException('حجم تصویر نباید بیشتر از ۸ مگابایت باشد');
        }

        // 1. بررسی واقعی MIME از محتوای باینری فایل (غیرقابل دور زدن با تغییر پسوند)
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $realMime = $finfo->file($file['tmp_name']);
        if (!in_array($realMime, self::ALLOWED_MIMES, true)) {
            throw new \RuntimeException('فرمت فایل معتبر نیست؛ فقط تصاویر استاندارد مجاز هستند');
        }

        // 2. بررسی ابعاد واقعی تصویر
        $imgInfo = @getimagesize($file['tmp_name']);
        if ($imgInfo === false || $imgInfo[0] < 10 || $imgInfo[1] < 10) {
            throw new \RuntimeException('ساختار فایل تصویری معتبر نیست');
        }

        [$origWidth, $origHeight] = $imgInfo;

        // 3. بازسازی تصویر در حافظه با GD (حذف کامل هرگونه کد مخرب یا متادیتای اضافی)
        $srcImage = match ($realMime) {
            'image/jpeg' => @imagecreatefromjpeg($file['tmp_name']),
            'image/png'  => @imagecreatefrompng($file['tmp_name']),
            'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($file['tmp_name']) : false,
            'image/gif'  => @imagecreatefromgif($file['tmp_name']),
            default      => false,
        };

        if (!$srcImage) {
            throw new \RuntimeException('امکان پردازش تصویر وجود ندارد');
        }

        // 4. محاسبه ابعاد جدید (حداکثر ۱۰۸۰ پیکسل برای بهینه‌سازی سرعت اینترنت موبایل)
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

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = sprintf('img-%d-%s.webp', time(), bin2hex(random_bytes(6)));
        $targetPath = rtrim($uploadDir, '/') . '/' . $filename;

        // 5. ذخیره خروجی به فرمت فشرده WebP
        if (function_exists('imagewebp')) {
            $saved = imagewebp($canvas, $targetPath, self::WEBP_QUALITY);
        } else {
            $filename = sprintf('img-%d-%s.jpg', time(), bin2hex(random_bytes(6)));
            $targetPath = rtrim($uploadDir, '/') . '/' . $filename;
            $saved = imagejpeg($canvas, $targetPath, self::WEBP_QUALITY);
        }

        imagedestroy($srcImage);
        imagedestroy($canvas);

        if (!$saved) {
            throw new \RuntimeException('خطا در ذخیره‌سازی تصویر بهینه‌شده');
        }

        return '/uploads/' . $filename;
    }
}

<?php
// ===== CONFIGURATION & DATABASE CONNECTION =====
// فایل تنظیمات اتصال امن به دیتابیس MySQL با PDO و غیرفعال‌سازی Emulated Prepares

declare(strict_types=1);

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'cafe_digital_menu');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'change-this-secret-in-production-2026-key');

function getDatabaseConnection(): PDO {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME);
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false, // جلوگیری قطعی از SQL Injection سطح دوم
        ]);
        return $pdo;
    } catch (\PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'خطا در اتصال به پایگاه داده']);
        exit;
    }
}

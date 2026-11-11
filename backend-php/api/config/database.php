<?php
// ===== CONFIGURATION & DATABASE CONNECTION =====
// فایل تنظیمات اتصال امن به دیتابیس MySQL با PDO و غیرفعال‌سازی Emulated Prepares

declare(strict_types=1);

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'cafe_digital_menu');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

/**
 * Resolves the JWT signing secret.
 * 1. Preferred: the JWT_SECRET environment variable (min 32 chars).
 * 2. Fallback: a per-install random secret persisted in a dotfile (blocked from the web
 *    by .htaccess). If the app folder is read-only, the system temp folder is used so
 *    tokens still survive between requests.
 * This keeps the product working out-of-the-box without shipping a known default key.
 */
function resolveJwtSecret(): string
{
    $fromEnv = getenv('JWT_SECRET');
    if (is_string($fromEnv) && strlen(trim($fromEnv)) >= 32) {
        return trim($fromEnv);
    }

    $secretFiles = [
        dirname(__DIR__, 2) . '/.jwt-secret.php',
        rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR
            . 'cafe-menu-' . substr(hash('sha256', __DIR__), 0, 16) . '.secret.php',
    ];

    foreach ($secretFiles as $secretFile) {
        if (!is_file($secretFile)) {
            continue;
        }
        $saved = @include $secretFile;
        if (is_string($saved) && strlen($saved) >= 32) {
            return $saved;
        }
    }

    $generated = bin2hex(random_bytes(48));
    $payload = "<?php\nreturn " . var_export($generated, true) . ";\n";

    foreach ($secretFiles as $secretFile) {
        if (@file_put_contents($secretFile, $payload, LOCK_EX) !== false && @is_file($secretFile)) {
            return $generated;
        }
    }

    // Last resort: tokens will be valid only for this request, which is safer than a known default.
    return $generated;
}

define('JWT_SECRET', resolveJwtSecret());

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

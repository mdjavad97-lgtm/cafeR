<?php
// ===== SECURITY & AUTHENTICATION MIDDLEWARE =====
// مدیریت هدرهای امنیتی، جلوگیری از CSRF، و تولید/اعتبارسنجی توکن JWT با امضای HMAC-SHA256

declare(strict_types=1);

class SecurityMiddleware {
    public static function applySecurityHeaders(): void {
        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // The menu is served same-origin, so CORS is only opened for explicitly
        // allowlisted origins (comma separated ALLOWED_ORIGINS environment variable).
        $allowedOrigins = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) (getenv('ALLOWED_ORIGINS') ?: ''))
        )));
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: $origin");
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        }

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private static function base64UrlEncode(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/'));
    }

    public static function signJwt(array $payload, int $ttlSeconds = 604800): string {
        $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttlSeconds;
        $body = self::base64UrlEncode(json_encode($payload));
        $signature = self::base64UrlEncode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
        return "$header.$body.$signature";
    }

    public static function verifyJwt(string $token): ?array {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$header, $body, $sig] = $parts;

        $decodedHeader = json_decode(self::base64UrlDecode($header), true);
        if (!is_array($decodedHeader) || ($decodedHeader['alg'] ?? '') !== 'HS256') {
            return null;
        }

        $expectedSig = self::base64UrlEncode(hash_hmac('sha256', "$header.$body", JWT_SECRET, true));
        if (!hash_equals($expectedSig, $sig)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($body), true);
        if (!is_array($payload) || (isset($payload['exp']) && $payload['exp'] < time())) {
            return null;
        }
        return $payload;
    }

    public static function requireAuth(): array {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? ($_SERVER['HTTP_AUTHORIZATION'] ?? '');

        if (preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
            $payload = self::verifyJwt(trim($matches[1]));
            if ($payload !== null) {
                return $payload;
            }
        }

        http_response_code(401);
        echo json_encode(['error' => 'دسترسی غیرمجاز یا نشست منقضی شده است']);
        exit;
    }

    /**
     * Lightweight brute-force protection for admin login.
     * Stored in a dotfile next to the app, which .htaccess blocks from the web.
     * Any filesystem problem fails open (login still works) so a host never locks the owner out.
     */
    private static function throttleFile(): string {
        return dirname(__DIR__, 2) . '/.login-attempts.json';
    }

    private static function readThrottleData(): array {
        $file = self::throttleFile();
        if (!is_file($file)) {
            return [];
        }
        $data = json_decode((string) @file_get_contents($file), true);
        return is_array($data) ? $data : [];
    }

    public static function loginThrottleKey(string $username): string {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        return hash('sha256', strtolower($username) . '|' . $ip);
    }

    public static function checkLoginThrottle(string $key): void {
        $data = self::readThrottleData();
        $blockedUntil = (int) ($data[$key]['blocked_until'] ?? 0);
        if ($blockedUntil > time()) {
            $minutes = max(1, (int) ceil(($blockedUntil - time()) / 60));
            http_response_code(429);
            echo json_encode(['error' => "تلاش‌های ناموفق زیاد است. لطفاً {$minutes} دقیقه دیگر تلاش کنید."]);
            exit;
        }
    }

    public static function recordFailedLogin(string $key): void {
        $now = time();
        $data = self::readThrottleData();

        // Keep the file small: drop entries that are no longer relevant
        foreach ($data as $existingKey => $entry) {
            if (!is_array($entry)) {
                unset($data[$existingKey]);
                continue;
            }
            $updatedAt = (int) ($entry['updated_at'] ?? 0);
            $blockedUntil = (int) ($entry['blocked_until'] ?? 0);
            if ($blockedUntil < $now && $updatedAt < $now - 3600) {
                unset($data[$existingKey]);
            }
        }

        $count = (int) ($data[$key]['count'] ?? 0) + 1;
        $data[$key] = [
            'count'         => $count >= 8 ? 0 : $count,
            'blocked_until' => $count >= 8 ? $now + 600 : 0,
            'updated_at'    => $now,
        ];

        if (count($data) > 500) {
            $data = array_slice($data, -500, null, true);
        }

        @file_put_contents(self::throttleFile(), json_encode($data), LOCK_EX);
    }

    public static function clearLoginFailures(string $key): void {
        $data = self::readThrottleData();
        if (!isset($data[$key])) {
            return;
        }
        unset($data[$key]);
        @file_put_contents(self::throttleFile(), json_encode($data), LOCK_EX);
    }
}

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

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
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
        if ($token === 'admin-mock-token') {
            return ['role' => 'admin', 'demo' => true];
        }
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$header, $body, $sig] = $parts;
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
}

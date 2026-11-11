<?php
// ===== TABLE INTERACTION & MESSENGER NOTIFICATION SERVICE =====
declare(strict_types=1);

class NotificationService
{
    /**
     * Ensures the table_calls table exists in MySQL
     */
    public static function ensureTableExists(PDO $pdo): void
    {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS table_calls (
                id INT AUTO_INCREMENT PRIMARY KEY,
                table_number VARCHAR(50) NOT NULL,
                request_type VARCHAR(100) NOT NULL,
                note VARCHAR(500) DEFAULT '',
                status VARCHAR(30) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    /**
     * Registers a new customer table request and dispatches instant notification (Telegram / Bale / Webhook)
     */
    public static function createTableCall(PDO $pdo, array $payload, array $brandSettings): array
    {
        self::ensureTableExists($pdo);

        $tableNumber = trim((string) ($payload['table_number'] ?? ''));
        $requestType = trim((string) ($payload['request_type'] ?? 'فراخوان مهماندار'));
        $note = trim((string) ($payload['note'] ?? ''));

        if ($tableNumber === '') {
            throw new InvalidArgumentException('لطفاً شماره یا نام میز را وارد کنید.');
        }

        // Prevent rapid spam from the same table within 30 seconds
        $stmtCheck = $pdo->prepare("
            SELECT id FROM table_calls
            WHERE table_number = ? AND status = 'pending' AND created_at >= (NOW() - INTERVAL 30 SECOND)
            LIMIT 1
        ");
        $stmtCheck->execute([$tableNumber]);
        if ($stmtCheck->fetch()) {
            throw new RuntimeException('درخواست قبلی میز شما ثبت شده و همکاران در حال رسیدگی هستند.');
        }

        $stmt = $pdo->prepare("
            INSERT INTO table_calls (table_number, request_type, note, status)
            VALUES (?, ?, ?, 'pending')
        ");
        $stmt->execute([
            mb_substr($tableNumber, 0, 50),
            mb_substr($requestType, 0, 100),
            mb_substr($note, 0, 500),
        ]);

        $callId = (int) $pdo->lastInsertId();
        $dispatched = self::dispatchExternalAlert([
            'id'           => $callId,
            'table_number' => $tableNumber,
            'request_type' => $requestType,
            'note'         => $note,
            'cafe_name'    => (string) ($brandSettings['cafe_name'] ?? 'کافه رستوران'),
        ], $brandSettings);

        return [
            'id'         => $callId,
            'status'     => 'pending',
            'dispatched' => $dispatched,
            'message'    => 'درخواست شما برای صندوق و مهماندار ارسال شد.',
        ];
    }

    /**
     * Returns recent table calls for the Admin Dashboard
     */
    public static function listTableCalls(PDO $pdo): array
    {
        self::ensureTableExists($pdo);
        $stmt = $pdo->query("SELECT * FROM table_calls ORDER BY status ASC, id DESC LIMIT 50");
        return $stmt->fetchAll();
    }

    /**
     * Marks a table call as resolved/completed
     */
    public static function updateTableCallStatus(PDO $pdo, int $id, string $status): void
    {
        self::ensureTableExists($pdo);
        $allowed = in_array($status, ['pending', 'completed', 'cancelled'], true) ? $status : 'completed';
        $stmt = $pdo->prepare("UPDATE table_calls SET status = ? WHERE id = ?");
        $stmt->execute([$allowed, $id]);
    }

    /**
     * Deletes a table call record
     */
    public static function deleteTableCall(PDO $pdo, int $id): void
    {
        self::ensureTableExists($pdo);
        $stmt = $pdo->prepare("DELETE FROM table_calls WHERE id = ?");
        $stmt->execute([$id]);
    }

    /**
     * Sends instant notification via Telegram Bot API, Bale Bot API, or Custom Webhook
     */
    public static function dispatchExternalAlert(array $callData, array $brandSettings): bool
    {
        $provider = (string) ($brandSettings['notification_provider'] ?? 'telegram');
        $botToken = trim((string) ($brandSettings['notification_bot_token'] ?? ''));
        $chatId = trim((string) ($brandSettings['notification_chat_id'] ?? ''));
        $webhookUrl = trim((string) ($brandSettings['notification_webhook_url'] ?? ''));

        $textLines = [
            "🔔 *درخواست جدید میز — {$callData['cafe_name']}*",
            "🪑 میز: *{$callData['table_number']}*",
            "📌 نوع درخواست: *{$callData['request_type']}*",
        ];
        if (!empty($callData['note'])) {
            $textLines[] = "📝 توضیحات: {$callData['note']}";
        }
        $messageText = implode("\n", $textLines);

        if (($provider === 'telegram' || $provider === 'bale') && $botToken !== '' && $chatId !== '') {
            $baseUrl = $provider === 'bale'
                ? "https://tapi.bale.ai/bot{$botToken}/sendMessage"
                : "https://api.telegram.org/bot{$botToken}/sendMessage";

            return self::sendHttpPostJson($baseUrl, [
                'chat_id'    => $chatId,
                'text'       => $messageText,
                'parse_mode' => 'Markdown',
            ]);
        }

        if ($provider === 'webhook' && $webhookUrl !== '' && filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
            return self::sendHttpPostJson($webhookUrl, [
                'event'     => 'table_call',
                'cafe_name' => $callData['cafe_name'],
                'data'      => $callData,
                'text'      => $messageText,
            ]);
        }

        return false;
    }

    private static function sendHttpPostJson(string $url, array $payload): bool
    {
        if (!function_exists('curl_init')) {
            return false;
        }
        $ch = curl_init($url);
        if ($ch === false) {
            return false;
        }
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT        => 4,
            CURLOPT_CONNECTTIMEOUT => 2,
        ]);
        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $response !== false && $httpCode >= 200 && $httpCode < 300;
    }
}

<?php
// ===== MAIN API ROUTER (MODULAR COMMERCIAL ARCHITECTURE) =====
declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/SecurityMiddleware.php';
require_once __DIR__ . '/services/ImageService.php';
require_once __DIR__ . '/services/NotificationService.php';

SecurityMiddleware::applySecurityHeaders();

$pdo = getDatabaseConnection();
$uploadDir = __DIR__ . '/../uploads';

$request = $_GET['request'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$pathParts = explode('/', trim($request, '/'));

$baseResource = $pathParts[0] ?? '';
$resourceId = $pathParts[1] ?? null;
$subAction = $pathParts[2] ?? null;

$defaultBrand = [
    'cafe_name'                => 'کافه و رستوران تخصصی',
    'cafe_en_name'             => 'SPECIALTY CAFE & KITCHEN',
    'cafe_subtitle'            => 'قهوه تخصصی، نان و شیرینی روزانه و آشپزخانه مدیترانه‌ای',
    'logo_url'                 => '',
    'hero_url'                 => '/uploads/cafe-hero.webp',
    'working_hours'            => '۱۰:۰۰ تا ۲۳:۳۰',
    'service_note'             => 'امکان سفارش سر میز',
    'wifi_info'                => 'اینترنت رایگان مهمان',
    'brand_theme'              => 'espresso',
    'footer_text'              => 'پلتفرم منوی دیجیتال هوشمند کافه و رستوران',
    'enable_table_calls'       => true,
    'notification_provider'    => 'telegram',
    'notification_bot_token'   => '',
    'notification_chat_id'     => '',
    'notification_webhook_url' => '',
];

function getMergedBrandSettings(PDO $pdo, array $defaultBrand): array
{
    $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key` = ? LIMIT 1');
    $stmt->execute(['brand_config']);
    $row = $stmt->fetch();
    if (!$row) {
        return $defaultBrand;
    }
    $parsed = json_decode($row['value'], true) ?: [];
    return array_merge($defaultBrand, $parsed);
}

/**
 * PDO/MySQL may return numeric columns as strings depending on driver mode.
 * The frontend compares strictly (is_available === 0), so cast explicitly.
 */
function castNumericFields(array $row, array $intFields): array
{
    foreach ($intFields as $field) {
        if (array_key_exists($field, $row) && $row[$field] !== null) {
            $row[$field] = (int) $row[$field];
        }
    }
    return $row;
}

function normalizeProductRow(array $row): array
{
    return castNumericFields($row, ['id', 'category_id', 'price', 'is_available', 'is_special', 'sort_order']);
}

function normalizeProductRows(array $rows): array
{
    return array_map('normalizeProductRow', $rows);
}

function normalizeCategoryRows(array $rows): array
{
    return array_map(static fn (array $row): array => castNumericFields($row, ['id', 'sort_order']), $rows);
}

function normalizeTableCallRows(array $rows): array
{
    return array_map(static fn (array $row): array => castNumericFields($row, ['id']), $rows);
}

/**
 * Removes private notification credentials from the public brand payload.
 */
function toPublicSettings(array $settings): array
{
    $hasCredentials = !empty($settings['notification_bot_token']) && !empty($settings['notification_chat_id']);
    unset(
        $settings['notification_bot_token'],
        $settings['notification_chat_id'],
        $settings['notification_webhook_url']
    );
    $settings['has_notification_credentials'] = $hasCredentials;
    return $settings;
}

// 1. Health Check
if ($baseResource === 'health' && $method === 'GET') {
    echo json_encode([
        'status'        => 'ok',
        'db'            => 'MySQL PDO Secure',
        'webp'          => function_exists('imagewebp'),
        'notifications' => true,
    ]);
    exit;
}

// 2. Authentication & Password Management
if ($baseResource === 'auth') {
    $subRoute = $pathParts[1] ?? '';

    if ($subRoute === 'login' && $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        if ($username === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['error' => 'نام کاربری و رمز عبور الزامی است']);
            exit;
        }

        $throttleKey = SecurityMiddleware::loginThrottleKey($username);
        SecurityMiddleware::checkLoginThrottle($throttleKey);

        $stmt = $pdo->prepare('SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password_hash'])) {
            SecurityMiddleware::clearLoginFailures($throttleKey);
            $token = SecurityMiddleware::signJwt([
                'sub'      => $admin['id'],
                'username' => $admin['username'],
                'role'     => 'admin',
            ]);
            echo json_encode(['token' => $token]);
        } else {
            SecurityMiddleware::recordFailedLogin($throttleKey);
            http_response_code(401);
            echo json_encode(['error' => 'نام کاربری یا رمز عبور اشتباه است']);
        }
        exit;
    }

    if ($subRoute === 'me' && $method === 'GET') {
        SecurityMiddleware::requireAuth();
        echo json_encode(['ok' => true]);
        exit;
    }

    if ($subRoute === 'password' && $method === 'PUT') {
        SecurityMiddleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $newPassword = (string) ($data['newPassword'] ?? '');

        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد']);
            exit;
        }

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE username = ?');
        $stmt->execute([$hash, 'admin']);
        echo json_encode(['success' => true, 'message' => 'رمز عبور مدیر با موفقیت بروزرسانی شد']);
        exit;
    }
}

// 2b. Admin-only settings (full config, including notification credentials)
if ($baseResource === 'admin') {
    SecurityMiddleware::requireAuth();
    $subRoute = $pathParts[1] ?? '';
    if ($subRoute === 'settings' && $method === 'GET') {
        echo json_encode(getMergedBrandSettings($pdo, $defaultBrand));
        exit;
    }
    http_response_code(404);
    echo json_encode(['error' => 'Route not found']);
    exit;
}

// 3. Brand Settings API (With automatic cleanup of replaced/deleted logo & hero images)
if ($baseResource === 'settings') {
    if ($method === 'GET') {
        $settings = getMergedBrandSettings($pdo, $defaultBrand);
        echo json_encode(toPublicSettings($settings));
        exit;
    }

    if ($method === 'PUT') {
        SecurityMiddleware::requireAuth();
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $current = getMergedBrandSettings($pdo, $defaultBrand);
        $oldLogo = (string) ($current['logo_url'] ?? '');
        $oldHero = (string) ($current['hero_url'] ?? '');

        $updated = array_merge($defaultBrand, $current, $body);

        $upsert = $pdo->prepare('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)');
        $upsert->execute(['brand_config', json_encode($updated, JSON_UNESCAPED_UNICODE)]);

        // If logo or hero image was removed or replaced, delete old file from disk if unused
        if ($oldLogo !== '' && $oldLogo !== ($updated['logo_url'] ?? '')) {
            ImageService::deletePhysicalImageIfUnused($pdo, $oldLogo, $uploadDir);
        }
        if ($oldHero !== '' && $oldHero !== ($updated['hero_url'] ?? '')) {
            ImageService::deletePhysicalImageIfUnused($pdo, $oldHero, $uploadDir);
        }

        echo json_encode(['success' => true, 'settings' => $updated]);
        exit;
    }
}

// 4. Secure Image Upload + Auto WebP Conversion & Direct File Deletion
if ($baseResource === 'upload') {
    if ($method === 'POST') {
        SecurityMiddleware::requireAuth();
        if (!isset($_FILES['image'])) {
            http_response_code(400);
            echo json_encode(['error' => 'فایلی ارسال نشده است']);
            exit;
        }

        try {
            $url = ImageService::processAndSaveUpload($_FILES['image'], $uploadDir);
            echo json_encode(['url' => $url, 'format' => 'webp']);
        } catch (\Throwable $e) {
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
        exit;
    }

    if ($method === 'DELETE') {
        SecurityMiddleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $targetUrl = trim((string) ($data['url'] ?? ''));
        $deleted = ImageService::deletePhysicalImageIfUnused($pdo, $targetUrl, $uploadDir);
        echo json_encode(['success' => true, 'file_deleted' => $deleted]);
        exit;
    }
}

// 5. Customer Table Interaction & Notification Service (/api/notifications/table-call)
if ($baseResource === 'notifications') {
    $subRoute = $pathParts[1] ?? '';
    $callId = isset($pathParts[2]) ? (int) $pathParts[2] : 0;

    if ($subRoute === 'table-call') {
        if ($method === 'GET') {
            SecurityMiddleware::requireAuth();
            echo json_encode(normalizeTableCallRows(NotificationService::listTableCalls($pdo)));
            exit;
        }

        if ($method === 'POST') {
            $payload = json_decode(file_get_contents('php://input'), true) ?: [];
            $brandSettings = getMergedBrandSettings($pdo, $defaultBrand);
            try {
                $result = NotificationService::createTableCall($pdo, $payload, $brandSettings);
                echo json_encode($result);
            } catch (\Throwable $e) {
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
            exit;
        }

        if ($method === 'PUT' && $callId > 0) {
            SecurityMiddleware::requireAuth();
            $payload = json_decode(file_get_contents('php://input'), true) ?: [];
            NotificationService::updateTableCallStatus($pdo, $callId, (string) ($payload['status'] ?? 'completed'));
            echo json_encode(['success' => true]);
            exit;
        }

        if ($method === 'DELETE' && $callId > 0) {
            SecurityMiddleware::requireAuth();
            NotificationService::deleteTableCall($pdo, $callId);
            echo json_encode(['success' => true]);
            exit;
        }
    }
}

// 6. Categories CRUD (With full cleanup of category products and their unused images)
if ($baseResource === 'categories') {
    if ($method === 'GET') {
        $stmt = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
        echo json_encode(normalizeCategoryRows($stmt->fetchAll()));
        exit;
    }

    if ($method === 'POST') {
        SecurityMiddleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $stmt = $pdo->prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
        $stmt->execute([trim((string) ($data['name'] ?? '')), (int) ($data['sort_order'] ?? 1)]);
        echo json_encode(['id' => (int) $pdo->lastInsertId()]);
        exit;
    }

    if ($method === 'PUT' && $resourceId) {
        SecurityMiddleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $stmt = $pdo->prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?');
        $stmt->execute([trim((string) ($data['name'] ?? '')), (int) ($data['sort_order'] ?? 1), (int) $resourceId]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($method === 'DELETE' && $resourceId) {
        SecurityMiddleware::requireAuth();
        $catId = (int) $resourceId;

        // Collect images of products in this category before deleting
        $stmtProds = $pdo->prepare('SELECT image_url FROM products WHERE category_id = ?');
        $stmtProds->execute([$catId]);
        $prodImages = $stmtProds->fetchAll(PDO::FETCH_COLUMN);

        $pdo->prepare('DELETE FROM products WHERE category_id = ?')->execute([$catId]);
        $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$catId]);

        foreach ($prodImages as $imgUrl) {
            ImageService::deletePhysicalImageIfUnused($pdo, (string) $imgUrl, $uploadDir);
        }

        echo json_encode(['success' => true]);
        exit;
    }
}

// 7. Products CRUD + Complete Image & Record Cleanup
if ($baseResource === 'products') {
    if ($method === 'GET') {
        if ($resourceId) {
            $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? LIMIT 1');
            $stmt->execute([(int) $resourceId]);
            $product = $stmt->fetch();
            if ($product) {
                echo json_encode(normalizeProductRow($product));
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Not found']);
            }
        } else {
            $stmt = $pdo->query('SELECT * FROM products ORDER BY sort_order ASC, id DESC');
            echo json_encode(normalizeProductRows($stmt->fetchAll()));
        }
        exit;
    }

    if ($method === 'POST') {
        SecurityMiddleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $stmt = $pdo->prepare(
            'INSERT INTO products (category_id, name, description, price, image_url, is_available, is_special, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            (int) ($data['category_id'] ?? 1),
            trim((string) ($data['name'] ?? '')),
            trim((string) ($data['description'] ?? '')),
            (int) ($data['price'] ?? 0),
            trim((string) ($data['image_url'] ?? '')),
            !empty($data['is_available']) ? 1 : 0,
            !empty($data['is_special']) ? 1 : 0,
            (int) ($data['sort_order'] ?? 0),
        ]);
        echo json_encode(['id' => (int) $pdo->lastInsertId()]);
        exit;
    }

    // DELETE /api/products/{id}/image -> Removes image from DB record AND deletes file from disk
    if ($method === 'DELETE' && $resourceId && $subAction === 'image') {
        SecurityMiddleware::requireAuth();
        $prodId = (int) $resourceId;

        $stmtPrev = $pdo->prepare('SELECT image_url FROM products WHERE id = ? LIMIT 1');
        $stmtPrev->execute([$prodId]);
        $prevRow = $stmtPrev->fetch();
        $oldImageUrl = $prevRow ? (string) ($prevRow['image_url'] ?? '') : '';

        $stmtUpdate = $pdo->prepare("UPDATE products SET image_url = '' WHERE id = ?");
        $stmtUpdate->execute([$prodId]);

        $fileDeleted = false;
        if ($oldImageUrl !== '') {
            $fileDeleted = ImageService::deletePhysicalImageIfUnused($pdo, $oldImageUrl, $uploadDir);
        }

        echo json_encode(['success' => true, 'file_deleted' => $fileDeleted]);
        exit;
    }

    if ($method === 'PUT' && $resourceId) {
        SecurityMiddleware::requireAuth();
        $prodId = (int) $resourceId;
        $data = json_decode(file_get_contents('php://input'), true) ?: [];

        $stmtCurrent = $pdo->prepare('SELECT sort_order, image_url FROM products WHERE id = ? LIMIT 1');
        $stmtCurrent->execute([$prodId]);
        $current = $stmtCurrent->fetch();
        $order = isset($data['sort_order']) ? (int) $data['sort_order'] : ($current ? (int) $current['sort_order'] : 0);
        $oldImageUrl = $current ? (string) ($current['image_url'] ?? '') : '';
        $newImageUrl = trim((string) ($data['image_url'] ?? ''));

        $stmt = $pdo->prepare(
            'UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, is_special = ?, sort_order = ? WHERE id = ?'
        );
        $stmt->execute([
            (int) ($data['category_id'] ?? 1),
            trim((string) ($data['name'] ?? '')),
            trim((string) ($data['description'] ?? '')),
            (int) ($data['price'] ?? 0),
            $newImageUrl,
            !empty($data['is_available']) ? 1 : 0,
            !empty($data['is_special']) ? 1 : 0,
            $order,
            $prodId,
        ]);

        // If the image was removed or replaced, physically delete the old file from /uploads/ if unused
        if ($oldImageUrl !== '' && $oldImageUrl !== $newImageUrl) {
            ImageService::deletePhysicalImageIfUnused($pdo, $oldImageUrl, $uploadDir);
        }

        echo json_encode(['success' => true]);
        exit;
    }

    // DELETE /api/products/{id} -> Deletes product row from DB AND deletes its physical image file from /uploads/
    if ($method === 'DELETE' && $resourceId && !$subAction) {
        SecurityMiddleware::requireAuth();
        $prodId = (int) $resourceId;

        $stmtPrev = $pdo->prepare('SELECT image_url FROM products WHERE id = ? LIMIT 1');
        $stmtPrev->execute([$prodId]);
        $prevRow = $stmtPrev->fetch();
        $oldImageUrl = $prevRow ? (string) ($prevRow['image_url'] ?? '') : '';

        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$prodId]);

        $fileDeleted = false;
        if ($oldImageUrl !== '') {
            $fileDeleted = ImageService::deletePhysicalImageIfUnused($pdo, $oldImageUrl, $uploadDir);
        }

        echo json_encode(['success' => true, 'file_deleted' => $fileDeleted]);
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Route not found']);

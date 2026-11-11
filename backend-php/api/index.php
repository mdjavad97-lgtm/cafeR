<?php
// ===== MAIN API ROUTER (MODULAR COMMERCIAL ARCHITECTURE) =====
declare(strict_types=1);

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/middleware/SecurityMiddleware.php';
require_once __DIR__ . '/services/ImageService.php';

SecurityMiddleware::applySecurityHeaders();

$pdo = getDatabaseConnection();

$request = $_GET['request'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$pathParts = explode('/', trim($request, '/'));

$baseResource = $pathParts[0] ?? '';
$resourceId = $pathParts[1] ?? null;

$defaultBrand = [
    'cafe_name'     => 'کافه و رستوران تخصصی',
    'cafe_en_name'  => 'SPECIALTY CAFE & KITCHEN',
    'cafe_subtitle' => 'قهوه تخصصی، نان و شیرینی روزانه و آشپزخانه مدیترانه‌ای',
    'logo_url'      => '',
    'hero_url'      => '/uploads/cafe-hero.webp',
    'working_hours' => '۱۰:۰۰ تا ۲۳:۳۰',
    'service_note'  => 'امکان سفارش سر میز',
    'wifi_info'     => 'اینترنت رایگان مهمان',
    'brand_theme'   => 'espresso',
    'footer_text'   => 'پلتفرم منوی دیجیتال هوشمند کافه و رستوران',
];

// 1. Health Check
if ($baseResource === 'health' && $method === 'GET') {
    echo json_encode(['status' => 'ok', 'db' => 'MySQL PDO Secure', 'webp' => function_exists('imagewebp')]);
    exit;
}

// 2. Authentication & Password Management
if ($baseResource === 'auth') {
    $subRoute = $pathParts[1] ?? '';

    if ($subRoute === 'login' && $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $username = trim((string) ($data['username'] ?? ''));
        $password = (string) ($data['password'] ?? '');

        $stmt = $pdo->prepare('SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password_hash'])) {
            $token = SecurityMiddleware::signJwt([
                'sub'      => $admin['id'],
                'username' => $admin['username'],
                'role'     => 'admin',
            ]);
            echo json_encode(['token' => $token]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'نام کاربری یا رمز عبور اشتباه است']);
        }
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

// 3. Brand Settings API
if ($baseResource === 'settings') {
    if ($method === 'GET') {
        $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key` = ? LIMIT 1');
        $stmt->execute(['brand_config']);
        $row = $stmt->fetch();
        if (!$row) {
            echo json_encode($defaultBrand);
            exit;
        }
        $parsed = json_decode($row['value'], true) ?: [];
        echo json_encode(array_merge($defaultBrand, $parsed));
        exit;
    }

    if ($method === 'PUT') {
        SecurityMiddleware::requireAuth();
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $stmt = $pdo->prepare('SELECT value FROM settings WHERE `key` = ? LIMIT 1');
        $stmt->execute(['brand_config']);
        $row = $stmt->fetch();
        $current = $row ? (json_decode($row['value'], true) ?: []) : [];
        $updated = array_merge($defaultBrand, $current, $body);

        $upsert = $pdo->prepare('INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)');
        $upsert->execute(['brand_config', json_encode($updated, JSON_UNESCAPED_UNICODE)]);
        echo json_encode(['success' => true, 'settings' => $updated]);
        exit;
    }
}

// 4. Secure Image Upload + Auto WebP Conversion
if ($baseResource === 'upload' && $method === 'POST') {
    SecurityMiddleware::requireAuth();
    if (!isset($_FILES['image'])) {
        http_response_code(400);
        echo json_encode(['error' => 'فایلی ارسال نشده است']);
        exit;
    }

    try {
        $url = ImageService::processAndSaveUpload($_FILES['image'], __DIR__ . '/../uploads');
        echo json_encode(['url' => $url]);
    } catch (\Throwable $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
    exit;
}

// 5. Categories CRUD
if ($baseResource === 'categories') {
    if ($method === 'GET') {
        $stmt = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
        echo json_encode($stmt->fetchAll());
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
        $stmt = $pdo->prepare('DELETE FROM categories WHERE id = ?');
        $stmt->execute([(int) $resourceId]);
        echo json_encode(['success' => true]);
        exit;
    }
}

// 6. Products CRUD
if ($baseResource === 'products') {
    if ($method === 'GET') {
        if ($resourceId) {
            $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? LIMIT 1');
            $stmt->execute([(int) $resourceId]);
            $product = $stmt->fetch();
            if ($product) {
                echo json_encode($product);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Not found']);
            }
        } else {
            $stmt = $pdo->query('SELECT * FROM products ORDER BY sort_order ASC, id DESC');
            echo json_encode($stmt->fetchAll());
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

    if ($method === 'PUT' && $resourceId) {
        SecurityMiddleware::requireAuth();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];

        $stmtCurrent = $pdo->prepare('SELECT sort_order FROM products WHERE id = ?');
        $stmtCurrent->execute([(int) $resourceId]);
        $current = $stmtCurrent->fetch();
        $order = isset($data['sort_order']) ? (int) $data['sort_order'] : ($current ? (int) $current['sort_order'] : 0);

        $stmt = $pdo->prepare(
            'UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, is_special = ?, sort_order = ? WHERE id = ?'
        );
        $stmt->execute([
            (int) ($data['category_id'] ?? 1),
            trim((string) ($data['name'] ?? '')),
            trim((string) ($data['description'] ?? '')),
            (int) ($data['price'] ?? 0),
            trim((string) ($data['image_url'] ?? '')),
            !empty($data['is_available']) ? 1 : 0,
            !empty($data['is_special']) ? 1 : 0,
            $order,
            (int) $resourceId,
        ]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($method === 'DELETE' && $resourceId) {
        SecurityMiddleware::requireAuth();
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([(int) $resourceId]);
        echo json_encode(['success' => true]);
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Route not found']);

<?php
// backend-php/api/index.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$db   = 'lilicafe';
$user = 'root'; // تغییر بدهید
$pass = '';     // تغییر بدهید

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Auto-upgrade schema: safely add sort_order column to products table if missing
    try {
        $pdo->exec("ALTER TABLE products ADD COLUMN sort_order INT DEFAULT 0");
    } catch (\PDOException $e) {
        // Column already exists, ignore safely
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

function checkAuth() {
    $headers = getallheaders();
    $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
    if ($authHeader === 'Bearer admin-mock-token') {
        return true;
    }
    http_response_code(401);
    echo json_encode(['error' => 'دسترسی غیرمجاز']);
    exit;
}

$request = isset($_GET['request']) ? $_GET['request'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$pathParts = explode('/', trim($request, '/'));

$baseResource = $pathParts[0] ?? '';
$resourceId = $pathParts[1] ?? null;

if ($baseResource === 'health' && $method === 'GET') {
    echo json_encode(['status' => 'ok', 'db' => 'MySQL configured']);
    exit;
}

if ($baseResource === 'auth' && ltrim($request, 'auth/') === 'login' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $pdo->prepare('SELECT * FROM admins WHERE username = ?');
    $stmt->execute([$data['username']]);
    $admin = $stmt->fetch();
    
    if ($admin && password_verify($data['password'], $admin['password_hash'])) {
        // برای سادگی در این نسخه، یک توکن دائم یا ساده ایجاد می‌کنیم. 
        // در پروژه‌های واقعی بهتر است از JWT یا Session استفاده کنید.
        $token = 'token_' . bin2hex(random_bytes(16));
        
        // ذخیره توکن در دیتابیس (اگر ستون آن را اضافه کرده باشید) یا بازگشت یک توکن ثابت فعلاً:
        echo json_encode(['token' => 'admin-mock-token']); // چون فرانت از این توکن استفاده می‌کند.
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'نام کاربری یا رمز عبور اشتباه است']);
    }
    exit;
}

if ($baseResource === 'upload' && $method === 'POST') {
    checkAuth();
    if(isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $allowed = array("jpg" => "image/jpg", "jpeg" => "image/jpeg", "gif" => "image/gif", "png" => "image/png", "webp" => "image/webp");
        $filename = $_FILES["image"]["name"];
        $filetype = $_FILES["image"]["type"];
        $filesize = $_FILES["image"]["size"];
    
        $ext = pathinfo($filename, PATHINFO_EXTENSION);
        if(!array_key_exists(strtolower($ext), $allowed)) {
            http_response_code(400); echo json_encode(['error' => 'فرمت فایل مجاز نیست']); exit;
        }
        
        $newFilename = time() . '-' . preg_replace("/[^a-zA-Z0-9.\-_]/", "", $filename);
        $uploadDir = '../uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
        
        if(move_uploaded_file($_FILES["image"]["tmp_name"], $uploadDir . $newFilename)){
            echo json_encode(['url' => '/uploads/' . $newFilename]);
        } else {
            http_response_code(500); echo json_encode(['error' => 'خطا در ذخیره فایل']);
        }
    } else {
        http_response_code(400); echo json_encode(['error' => 'فایلی ارسال نشده']);
    }
    exit;
}

if ($baseResource === 'categories') {
    if ($method === 'GET') {
        $stmt = $pdo->query('SELECT * FROM categories ORDER BY sort_order ASC');
        echo json_encode($stmt->fetchAll());
        exit;
    }

    if ($method === 'POST') {
        checkAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
        $stmt->execute([$data['name'], $data['sort_order'] ?? 1]);
        echo json_encode(['id' => $pdo->lastInsertId()]);
        exit;
    }

    if ($method === 'PUT') {
        checkAuth();
        if ($resourceId) {
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?');
            $stmt->execute([$data['name'], $data['sort_order'] ?? 1, $resourceId]);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(400); echo json_encode(['error' => 'آیدی مشخص نشده است']);
        }
        exit;
    }

    if ($method === 'DELETE') {
        checkAuth();
        if ($resourceId) {
            $stmt = $pdo->prepare('DELETE FROM categories WHERE id = ?');
            $stmt->execute([$resourceId]);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(400); echo json_encode(['error' => 'آیدی مشخص نشده است']);
        }
        exit;
    }
}

if ($baseResource === 'products') {
    if ($method === 'GET') {
        if ($resourceId) {
            $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
            $stmt->execute([$resourceId]);
            $product = $stmt->fetch();
            if ($product) {
                echo json_encode($product);
            } else {
                http_response_code(404); echo json_encode(['error' => 'Not found']);
            }
        } else {
            $stmt = $pdo->query('SELECT * FROM products ORDER BY sort_order ASC, id DESC');
            echo json_encode($stmt->fetchAll());
        }
        exit;
    }
    
    if ($method === 'POST') {
        checkAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('INSERT INTO products (category_id, name, description, price, image_url, is_available, is_special, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $data['category_id'], 
            $data['name'], 
            $data['description'] ?? '', 
            $data['price'], 
            $data['image_url'] ?? '', 
            isset($data['is_available']) && $data['is_available'] ? 1 : 0, 
            isset($data['is_special']) && $data['is_special'] ? 1 : 0,
            $data['sort_order'] ?? 0
        ]);
        echo json_encode(['id' => $pdo->lastInsertId()]);
        exit;
    }
    
    if ($method === 'PUT' && $resourceId) {
        checkAuth();
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Retrieve current product to preserve sort_order if not provided
        $stmtCurrent = $pdo->prepare('SELECT sort_order FROM products WHERE id = ?');
        $stmtCurrent->execute([$resourceId]);
        $current = $stmtCurrent->fetch();
        $order = isset($data['sort_order']) ? intval($data['sort_order']) : ($current ? intval($current['sort_order']) : 0);
        
        $stmt = $pdo->prepare('UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, is_special = ?, sort_order = ? WHERE id = ?');
        $stmt->execute([
            $data['category_id'], 
            $data['name'], 
            $data['description'] ?? '', 
            $data['price'], 
            $data['image_url'] ?? '', 
            isset($data['is_available']) && $data['is_available'] ? 1 : 0, 
            isset($data['is_special']) && $data['is_special'] ? 1 : 0,
            $order,
            $resourceId
        ]);
        echo json_encode(['success' => true]);
        exit;
    }
    
    if ($method === 'DELETE' && $resourceId) {
        checkAuth();
        $stmt = $pdo->prepare('DELETE FROM products WHERE id = ?');
        $stmt->execute([$resourceId]);
        echo json_encode(['success' => true]);
        exit;
    }
}

http_response_code(404);
echo json_encode(['error' => 'Route not found']);

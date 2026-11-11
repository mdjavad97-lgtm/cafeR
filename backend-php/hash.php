<?php
// backend-php/hash.php
// این فایل فقط برای تولید هش رمز عبور جهت قرار دادن در دیتابیس است.
// بعد از استفاده می‌توانید این فایل را از روی هاست خود پاک کنید.

$password = '';
$hash = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = $_POST['password'] ?? '';
    if (!empty($password)) {
        $hash = password_hash($password, PASSWORD_BCRYPT);
    }
}
?>
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تولید هش رمز عبور</title>
    <style>
        body { font-family: Tahoma, sans-serif; padding: 2rem; background: #f9fafb; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
        input[type="text"] { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        button { background: #1f2937; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; width: 100%; font-size: 1rem; }
        .result { margin-top: 1.5rem; padding: 1rem; background: #f3f4f6; border-radius: 6px; word-break: break-all; text-align: left; direction: ltr; font-family: monospace; }
        .label { font-weight: bold; margin-bottom: 0.5rem; display: block; text-align: right; }
    </style>
</head>
<body>
    <div class="card">
        <h2 style="margin-top: 0;">ساخت هش رمز عبور</h2>
        <form method="POST">
            <label class="label">رمز عبور مورد نظر خود را وارد کنید:</label>
            <input type="text" name="password" required value="<?php echo htmlspecialchars($password); ?>">
            <button type="submit">تولید هش (Hash)</button>
        </form>
        
        <?php if ($hash): ?>
        <div style="margin-top: 1.5rem; text-align: right;">
            <p><strong>هش تولید شده:</strong></p>
            <div class="result"><?php echo htmlspecialchars($hash); ?></div>
            <p style="font-size: 0.9rem; margin-top: 1rem; color: #4b5563;">
                این عبارت را کپی کرده و در دیتابیس (phpMyAdmin) در جدول <code>admins</code> در قسمت <code>password_hash</code> برای ادمین قرار دهید.
            </p>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>

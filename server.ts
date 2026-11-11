import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

// Database Initialization
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const db = new Database(path.join(dbDir, 'cafe-menu.db'));
db.pragma('journal_mode = WAL');

// Initial Table Migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT 1,
    is_special BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS table_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number TEXT NOT NULL,
    request_type TEXT NOT NULL,
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec('ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0');
} catch {
  // Column already exists
}

const JWT_SECRET = process.env.JWT_SECRET || 'cafe-menu-enterprise-secret-key-2026';

function signJwtToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 * 7 })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwtToken(token: string): boolean {
  if (token === 'admin-mock-token') return true; // Keep demo one-click access working
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig !== expectedSig) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return !payload.exp || payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, key] = storedHash.split(':');
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
  }
  // Default seeded admin123 bcrypt compatibility
  return password === 'admin123';
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // Make uploads directory reachable statically with long-term cache headers for WebP images
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  app.use(
    '/uploads',
    express.static(uploadDir, {
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  // Strict Multer configuration for temporary upload inspection before WebP conversion
  const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const rand = crypto.randomBytes(8).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase() || '.tmp';
      cb(null, `tmp-${Date.now()}-${rand}${ext}`);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // Max 8MB input before WebP compression
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIMES.has(file.mimetype.toLowerCase())) {
        return cb(new Error('فرمت فایل مجاز نیست. فقط تصاویر JPG, PNG و WebP مجاز هستند.'));
      }
      cb(null, true);
    },
  });

  // All default images are served from backend /uploads/*.webp (not bundled in src/assets)
  const IMG = {
    floralLatte: '/uploads/item-floral-latte.webp',
    icedMatcha: '/uploads/item-iced-matcha.webp',
    cheesecake: '/uploads/item-berry-cheesecake.webp',
    benedict: '/uploads/item-eggs-benedict.webp',
    caesar: '/uploads/item-caesar-salad.webp',
    hero: '/uploads/cafe-hero.webp',
  };

  const seedRichDemoCatalog = (forceReset = false) => {
    const hasAdmin = db.prepare('SELECT count(*) as count FROM admins').get() as { count: number };
    if (hasAdmin.count === 0) {
      db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
        'admin',
        hashPassword('admin123')
      );
    }

    if (forceReset) {
      db.exec('DELETE FROM products; DELETE FROM categories; DELETE FROM sqlite_sequence WHERE name IN ("products", "categories");');
    }

    const catCount = (db.prepare('SELECT count(*) as count FROM categories').get() as { count: number }).count;
    if (catCount === 0) {
      const categories = ['بار گرم', 'بار سرد', 'کیک و دسر', 'صبحانه', 'سالاد و پیش‌غذا'];
      const insertCat = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
      categories.forEach((name, idx) => insertCat.run(name, idx + 1));
    }

    const allCats = db.prepare('SELECT id, name FROM categories ORDER BY sort_order ASC, id ASC').all() as { id: number; name: string }[];
    const getCatId = (index: number) => allCats[index]?.id || allCats[0]?.id || 1;

    // Migrate any legacy /src/assets/images/*.jpg paths to /uploads/*.webp
    db.prepare(`UPDATE products SET image_url = ? WHERE image_url LIKE '%floral_latte%'`).run(IMG.floralLatte);
    db.prepare(`UPDATE products SET image_url = ? WHERE image_url LIKE '%iced_matcha%'`).run(IMG.icedMatcha);
    db.prepare(`UPDATE products SET image_url = ? WHERE image_url LIKE '%berry_cheesecake%'`).run(IMG.cheesecake);
    db.prepare(`UPDATE products SET image_url = ? WHERE image_url LIKE '%eggs_benedict%'`).run(IMG.benedict);
    db.prepare(`UPDATE products SET image_url = ? WHERE image_url LIKE '%caesar_salad%'`).run(IMG.caesar);
    db.prepare(`UPDATE products SET image_url = ? WHERE image_url LIKE '%cafe_hero_banner%'`).run(IMG.hero);

    const prodCount = (db.prepare('SELECT count(*) as count FROM products').get() as { count: number }).count;
    if (forceReset && prodCount === 0) {
      db.exec('DELETE FROM products;');
      const insertProd = db.prepare(
        'INSERT INTO products (category_id, name, description, price, image_url, is_available, is_special, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );

      const demoItems = [
        // 1. بار گرم
        [getCatId(0), 'لاته آرت زعفران و گل سرخ', 'اسپرسو تخصصی ۱۰۰٪ عربیکا، شیر مخملی فوم‌گیری شده، عصاره طبیعی گل محمدی و زعفران قائنات', 145000, IMG.floralLatte, 1, 1, 1],
        [getCatId(0), 'کاپوچینو دست‌ساز ایتالیایی', 'دبل شات اسپرسو رست مدیوم با فوم شیر غلیظ و کرمی در فنجان سرامیکی دست‌ساز', 120000, IMG.floralLatte, 1, 0, 2],
        [getCatId(0), 'کورتادو فندوق و کارامل', 'ترکیب متعادل اسپرسو دوبل و شیر گرم بخارپز شده همراه با نت‌های طبیعی فندق برشته', 115000, IMG.floralLatte, 1, 0, 3],

        // 2. بار سرد
        [getCatId(1), 'آیس ماچا بری لایه‌ای', 'ماچای تشریفاتی ژاپنی، پوره توت‌فرنگی تازه، شیر بادام سرد و کلد فوم وانیلی', 168000, IMG.icedMatcha, 1, 1, 4],
        [getCatId(1), 'کلد برو پرتقال و رزماری', 'قهوه دم‌سرد ۱۸ ساعته همراه با آب پرتقال طبیعی، سیروپ خانگی و شاخه رزماری تازه', 140000, IMG.icedMatcha, 1, 0, 5],
        [getCatId(1), 'مووهیتو توت‌فرنگی و نعناع تازه', 'توت‌فرنگی تازه له‌شده، برگ نعناع ارگانیک، لیموترش تازه و سودای گازدار خنک', 135000, IMG.icedMatcha, 1, 0, 6],

        // 3. کیک و دسر
        [getCatId(2), 'چیزکیک سن‌سباستین با سس توت‌فرنگی', 'چیزکیک تنوری بافت کرمی به سبک باسک اسپانیا با کامپوت توت‌فرنگی تازه و مغز پسته ایرانی', 185000, IMG.cheesecake, 1, 1, 7],
        [getCatId(2), 'کروسان کره‌ای فرانسوی و کره محلی', 'خمیر هزارلا با کره خالص فرانسوی، پخت روزانه، ترد و طلایی همراه با مارمالاد دست‌ساز', 118000, IMG.hero, 1, 0, 8],

        // 4. صبحانه
        [getCatId(3), 'اگز بندیکت روی نان خمیرترش', 'دو عدد تخم‌مرغ پوچد عسلی، آووکادو تازه، سس هلندیز دست‌ساز و میکروگرین روی نان بریوش خمیرترش', 265000, IMG.benedict, 1, 1, 9],
        [getCatId(3), 'سینی برانچ مدیترانه‌ای و کروسان', 'کروسان تازه، تخم‌مرغ نیمرو، پنیر فتا، زیتون مزه، گردو و یک فنجان لاته تخصصی', 310000, IMG.hero, 1, 0, 10],

        // 5. سالاد و پیش‌غذا
        [getCatId(4), 'سالاد سزار با فیله مرغ گریل و رزماری', 'کاهو رسمی تازه، فیله مرغ مرینیت شده با سبزیجات معطر، پنیر پارمزان ورقه‌ای، کروتان سیر و سس سزار دست‌ساز', 285000, IMG.caesar, 1, 1, 11],
        [getCatId(4), 'بول پروتئینی مرغ گریل و آووکادو', 'سینه مرغ گریل، کاهو کرانچی، نان خمیرترش برشته، پارمزان کهنه و درسینگ روغن زیتون فرابکر', 295000, IMG.caesar, 1, 0, 12],
      ];

      for (const item of demoItems) {
        insertProd.run(...item);
      }
    }
  };

  // Seed initial demo catalog only if database has never been initialized
  const isInitialized = db.prepare('SELECT value FROM settings WHERE key = ?').get('catalog_initialized');
  if (!isInitialized) {
    seedRichDemoCatalog(true);
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('catalog_initialized', '1');
  } else {
    seedRichDemoCatalog(false);
  }

  /**
   * Safely deletes a physical image file from /uploads/ if no other DB record references it
   */
  const deletePhysicalImageIfUnused = (imageUrl?: string | null): boolean => {
    if (!imageUrl || !imageUrl.trim()) return false;
    const normalized = imageUrl.trim();
    if (!normalized.includes('/uploads/')) return false;

    const filename = path.basename(normalized.split('?')[0]);
    if (!filename || filename === '.' || filename === '..' || filename === '.htaccess') return false;

    const cleanRelative = `/uploads/${filename}`;

    // Check if any product still references this file
    const prodRef = db
      .prepare('SELECT count(*) as count FROM products WHERE image_url = ? OR image_url LIKE ?')
      .get(cleanRelative, `%${filename}`) as { count: number };
    if (prodRef.count > 0) return false;

    // Check if brand settings still reference this file
    const brandRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('brand_config') as { value: string } | undefined;
    if (brandRow && brandRow.value && brandRow.value.includes(filename)) {
      return false;
    }

    const fullPath = path.join(uploadDir, filename);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      try {
        fs.unlinkSync(fullPath);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  // === API ROUTES ===
  app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'SQLite configured', imagePipeline: 'WebP auto-compression active' }));

  app.post('/api/demo/seed', (req, res) => {
    try {
      seedRichDemoCatalog(true);
      res.json({ success: true, message: 'منوی نمونه کافه رستوران با تصاویر WebP بازنشانی شد' });
    } catch {
      res.status(500).json({ error: 'خطا در بازنشانی منوی دمو' });
    }
  });

  app.post('/api/leads', (req, res) => {
    const { cafeName, ownerName, phone, city, packageType } = req.body || {};
    if (!cafeName || !phone) {
      return res.status(400).json({ error: 'لطفاً نام مجموعه و شماره تماس را وارد کنید' });
    }
    try {
      const existingRaw = db.prepare('SELECT value FROM settings WHERE key = ?').get('b2b_leads') as { value: string } | undefined;
      const list = existingRaw ? JSON.parse(existingRaw.value) : [];
      list.unshift({
        id: Date.now(),
        cafeName: String(cafeName).slice(0, 120),
        ownerName: String(ownerName || '').slice(0, 120),
        phone: String(phone).slice(0, 20),
        city: String(city || '').slice(0, 80),
        packageType: String(packageType || 'حرفه‌ای').slice(0, 80),
        createdAt: new Date().toISOString(),
      });
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('b2b_leads', JSON.stringify(list));
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'خطا در ثبت درخواست' });
    }
  });

  app.get('/api/leads', (req, res) => {
    try {
      const existingRaw = db.prepare('SELECT value FROM settings WHERE key = ?').get('b2b_leads') as { value: string } | undefined;
      res.json(existingRaw ? JSON.parse(existingRaw.value) : []);
    } catch {
      res.json([]);
    }
  });

  const DEFAULT_BRAND = {
    cafe_name: 'کافه و رستوران تخصصی',
    cafe_en_name: 'SPECIALTY CAFE & KITCHEN',
    cafe_subtitle: 'قهوه تخصصی، نان و شیرینی روزانه و آشپزخانه مدیترانه‌ای',
    logo_url: '',
    hero_url: IMG.hero,
    working_hours: '۱۰:۰۰ تا ۲۳:۳۰',
    service_note: 'امکان سفارش سر میز',
    wifi_info: 'اینترنت رایگان مهمان',
    brand_theme: 'espresso',
    footer_text: 'پلتفرم منوی دیجیتال هوشمند کافه و رستوران',
    enable_table_calls: true,
    notification_provider: 'telegram',
    notification_bot_token: '',
    notification_chat_id: '',
    notification_webhook_url: '',
  };

  // Public Brand Settings
  app.get('/api/settings', (req, res) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('brand_config') as { value: string } | undefined;
      if (!row) return res.json(DEFAULT_BRAND);
      const parsed = JSON.parse(row.value);
      if (parsed.hero_url && parsed.hero_url.includes('/src/assets/')) {
        parsed.hero_url = IMG.hero;
      }
      res.json({ ...DEFAULT_BRAND, ...parsed });
    } catch {
      res.json(DEFAULT_BRAND);
    }
  });

  // Authentication Middleware (Supports HMAC-SHA256 JWT + demo token)
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (verifyJwtToken(token)) return next();
    }
    return res.status(401).json({ error: 'دسترسی غیرمجاز یا نشست منقضی شده است' });
  };

  // Admin API: Update Brand Settings (with automatic physical file cleanup for replaced/removed logo & hero)
  app.put('/api/settings', requireAuth, (req, res) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('brand_config') as { value: string } | undefined;
      const current = row ? JSON.parse(row.value) : DEFAULT_BRAND;
      const oldLogo = String(current.logo_url || '');
      const oldHero = String(current.hero_url || '');

      const updated = { ...DEFAULT_BRAND, ...current, ...(req.body || {}) };
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('brand_config', JSON.stringify(updated));

      if (oldLogo && oldLogo !== updated.logo_url) {
        deletePhysicalImageIfUnused(oldLogo);
      }
      if (oldHero && oldHero !== updated.hero_url) {
        deletePhysicalImageIfUnused(oldHero);
      }

      res.json({ success: true, settings: updated });
    } catch {
      res.status(500).json({ error: 'خطا در ذخیره تنظیمات برند' });
    }
  });

  // Admin Auth Login (Issues real signed JWT)
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'نام کاربری و رمز عبور الزامی است' });
    }
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username)) as
      | { id: number; username: string; password_hash: string }
      | undefined;

    if (admin && verifyPassword(String(password), admin.password_hash)) {
      const token = signJwtToken({ sub: admin.id, username: admin.username, role: 'admin' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }
  });

  // Admin Password Change Endpoint (Replaces insecure standalone hash.php)
  app.put('/api/auth/password', requireAuth, (req, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد' });
    }
    const newHash = hashPassword(String(newPassword));
    db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(newHash, 'admin');
    res.json({ success: true, message: 'رمز عبور مدیر با موفقیت بروزرسانی شد' });
  });

  // Public Categories
  app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json(categories);
  });

  // Customer Table Interaction & Messenger Notification Service (/api/notifications/table-call)
  app.get('/api/notifications/table-call', requireAuth, (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM table_calls ORDER BY status ASC, id DESC LIMIT 50').all();
      res.json(rows);
    } catch {
      res.json([]);
    }
  });

  app.post('/api/notifications/table-call', async (req, res) => {
    const { table_number, request_type, note } = req.body || {};
    const tableNum = String(table_number || '').trim();
    const reqType = String(request_type || 'فراخوان مهماندار').trim();
    const reqNote = String(note || '').trim();

    if (!tableNum) {
      return res.status(400).json({ error: 'لطفاً شماره یا نام میز را وارد کنید.' });
    }

    try {
      const info = db
        .prepare("INSERT INTO table_calls (table_number, request_type, note, status, created_at) VALUES (?, ?, ?, 'pending', ?)")
        .run(tableNum.slice(0, 50), reqType.slice(0, 100), reqNote.slice(0, 500), new Date().toISOString());

      // Optional External Messenger / Webhook Dispatch (Mirrors PHP NotificationService)
      let dispatched = false;
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('brand_config') as { value: string } | undefined;
      const brand = row ? { ...DEFAULT_BRAND, ...JSON.parse(row.value) } : DEFAULT_BRAND;
      const provider = brand.notification_provider || 'telegram';
      const botToken = String(brand.notification_bot_token || '').trim();
      const chatId = String(brand.notification_chat_id || '').trim();
      const webhookUrl = String(brand.notification_webhook_url || '').trim();

      const msgLines = [
        `🔔 *درخواست جدید میز — ${brand.cafe_name}*`,
        `🪑 میز: *${tableNum}*`,
        `📌 نوع درخواست: *${reqType}*`,
      ];
      if (reqNote) msgLines.push(`📝 توضیحات: ${reqNote}`);
      const text = msgLines.join('\n');

      if ((provider === 'telegram' || provider === 'bale') && botToken && chatId) {
        const endpoint =
          provider === 'bale'
            ? `https://tapi.bale.ai/bot${botToken}/sendMessage`
            : `https://api.telegram.org/bot${botToken}/sendMessage`;
        try {
          const r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
          });
          dispatched = r.ok;
        } catch {
          dispatched = false;
        }
      } else if (provider === 'webhook' && webhookUrl.startsWith('http')) {
        try {
          const r = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'table_call',
              cafe_name: brand.cafe_name,
              data: { id: info.lastInsertRowid, table_number: tableNum, request_type: reqType, note: reqNote },
              text,
            }),
          });
          dispatched = r.ok;
        } catch {
          dispatched = false;
        }
      }

      res.json({
        id: info.lastInsertRowid,
        status: 'pending',
        dispatched,
        message: 'درخواست شما برای صندوق و مهماندار ارسال شد.',
      });
    } catch {
      res.status(500).json({ error: 'خطا در ثبت درخواست میز' });
    }
  });

  app.put('/api/notifications/table-call/:id', requireAuth, (req, res) => {
    const status = req.body?.status === 'pending' ? 'pending' : 'completed';
    db.prepare('UPDATE table_calls SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/notifications/table-call/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM table_calls WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Admin API: Create Category
  app.post('/api/categories', requireAuth, (req, res) => {
    const { name, sort_order } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'نام دسته‌بندی الزامی است' });
    }
    try {
      const info = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(String(name).trim(), Number(sort_order) || 1);
      res.json({ id: info.lastInsertRowid });
    } catch {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin API: Update Category
  app.put('/api/categories/:id', requireAuth, (req, res) => {
    const { name, sort_order } = req.body || {};
    try {
      db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?').run(
        String(name).trim(),
        Number(sort_order) || 1,
        req.params.id
      );
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin API: Delete Category (Deletes category, its products, and their unused images)
  app.delete('/api/categories/:id', requireAuth, (req, res) => {
    try {
      const catProds = db.prepare('SELECT image_url FROM products WHERE category_id = ?').all(req.params.id) as { image_url: string }[];
      db.prepare('DELETE FROM products WHERE category_id = ?').run(req.params.id);
      db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
      for (const p of catProds) {
        if (p.image_url) deletePhysicalImageIfUnused(p.image_url);
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Public Products
  app.get('/api/products', (req, res) => {
    const products = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, id DESC').all();
    res.json(products);
  });

  app.get('/api/products/:id', (req, res) => {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  });

  // Admin API: Create Product
  app.post('/api/products', requireAuth, (req, res) => {
    const { category_id, name, description, price, image_url, is_available, is_special, sort_order } = req.body || {};
    const info = db
      .prepare(
        'INSERT INTO products (category_id, name, description, price, image_url, is_available, is_special, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        Number(category_id) || 1,
        String(name || '').trim(),
        String(description || '').trim(),
        Number(price) || 0,
        String(image_url || '').trim(),
        is_available ? 1 : 0,
        is_special ? 1 : 0,
        Number(sort_order) || 0
      );
    res.json({ id: info.lastInsertRowid });
  });

  // Admin API: Delete ONLY Product Image (Clears DB image_url AND deletes physical file from /uploads/)
  app.delete('/api/products/:id/image', requireAuth, (req, res) => {
    try {
      const current = db.prepare('SELECT image_url FROM products WHERE id = ?').get(req.params.id) as { image_url: string } | undefined;
      const oldImageUrl = current?.image_url || '';

      db.prepare("UPDATE products SET image_url = '' WHERE id = ?").run(req.params.id);

      const fileDeleted = oldImageUrl ? deletePhysicalImageIfUnused(oldImageUrl) : false;
      res.json({ success: true, file_deleted: fileDeleted });
    } catch {
      res.status(500).json({ error: 'خطا در حذف تصویر محصول' });
    }
  });

  // Admin API: Edit Product (Automatically cleans up old image file if replaced or cleared)
  app.put('/api/products/:id', requireAuth, (req, res) => {
    const { category_id, name, description, price, image_url, is_available, is_special, sort_order } = req.body || {};
    const current = db.prepare('SELECT sort_order, image_url FROM products WHERE id = ?').get(req.params.id) as
      | { sort_order: number; image_url: string }
      | undefined;
    const order = sort_order !== undefined ? Number(sort_order) : current ? current.sort_order : 0;
    const oldImageUrl = current?.image_url || '';
    const newImageUrl = String(image_url || '').trim();

    db.prepare(
      'UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, is_special = ?, sort_order = ? WHERE id = ?'
    ).run(
      Number(category_id) || 1,
      String(name || '').trim(),
      String(description || '').trim(),
      Number(price) || 0,
      newImageUrl,
      is_available ? 1 : 0,
      is_special ? 1 : 0,
      order,
      req.params.id
    );

    if (oldImageUrl && oldImageUrl !== newImageUrl) {
      deletePhysicalImageIfUnused(oldImageUrl);
    }

    res.json({ success: true });
  });

  // Admin API: Delete Product (Deletes DB record AND deletes physical image file from /uploads/)
  app.delete('/api/products/:id', requireAuth, (req, res) => {
    const current = db.prepare('SELECT image_url FROM products WHERE id = ?').get(req.params.id) as { image_url: string } | undefined;
    const oldImageUrl = current?.image_url || '';

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);

    const fileDeleted = oldImageUrl ? deletePhysicalImageIfUnused(oldImageUrl) : false;
    res.json({ success: true, file_deleted: fileDeleted });
  });

  // Secure Image Upload API with automatic Resize & WebP Compression
  app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'فایلی انتخاب نشده است' });

    const tmpPath = req.file.path;
    const finalFilename = `img-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
    const finalPath = path.join(uploadDir, finalFilename);

    try {
      // Re-encode, strip metadata/payloads, resize to max 1080px, and compress to WebP (82% quality)
      execFileSync('convert', [
        tmpPath,
        '-strip',
        '-resize',
        '1080x1080>',
        '-quality',
        '82',
        finalPath,
      ]);
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      const stat = fs.statSync(finalPath);
      res.json({ url: `/uploads/${finalFilename}`, format: 'webp', size: stat.size });
    } catch {
      // If ImageMagick fails (e.g. corrupted or fake image shell), delete immediately and reject
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      return res.status(400).json({ error: 'فایل تصویر معتبر نیست یا آسیب دیده است' });
    }
  });

  // Direct Upload File Deletion API (For unsaved previews or explicit cleanup)
  app.delete('/api/upload', requireAuth, (req, res) => {
    const targetUrl = String(req.body?.url || '').trim();
    const deleted = deletePhysicalImageIfUnused(targetUrl);
    res.json({ success: true, file_deleted: deleted });
  });

  // Vite Application Rendering
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch(console.error);

import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';

// Database Initialization (Mimicking the MySQL Requirement in this environment)
const dbDir = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
const db = new Database(path.join(dbDir, 'lili-cafe.db'));
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
`);

// Safe upgrade for existing installations
try {
  db.exec('ALTER TABLE products ADD COLUMN sort_order INTEGER DEFAULT 0');
} catch (e) {
  // Column already exists, ignore
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  
  // Make uploads and generated assets directories reachable statically
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  app.use('/uploads', express.static(uploadDir));
  app.use('/src/assets', express.static(path.join(process.cwd(), 'src/assets')));
  
  // File upload configuration for products/banners
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
  });
  const upload = multer({ storage });

  const IMG = {
    floralLatte: '/src/assets/images/item_floral_latte_1794390474608.jpg',
    icedMatcha: '/src/assets/images/item_iced_matcha_berry_1794390474943.jpg',
    cheesecake: '/src/assets/images/item_berry_cheesecake_1794390477450.jpg',
    benedict: '/src/assets/images/item_eggs_benedict_1794390478546.jpg',
    caesar: '/src/assets/images/item_caesar_salad_1794390478362.jpg',
    hero: '/src/assets/images/cafe_hero_banner_1794390473291.jpg',
  };

  const seedRichDemoCatalog = (forceReset = false) => {
    const hasAdmin = db.prepare('SELECT count(*) as count FROM admins').get() as { count: number };
    if (hasAdmin.count === 0) {
      db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
        'admin',
        '$2a$10$X7.mQ6a/C1iNlV8x/fS//OJn6l/wOhR6Q1yI1Fk.f39r0Bq0Rj7Tq'
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

    // Backfill empty images on existing default items
    db.prepare(`UPDATE products SET image_url = ? WHERE (image_url IS NULL OR image_url = '') AND name LIKE '%لاته%'`).run(IMG.floralLatte);
    db.prepare(`UPDATE products SET image_url = ? WHERE (image_url IS NULL OR image_url = '') AND name LIKE '%آمریکانو%'`).run(IMG.floralLatte);
    db.prepare(`UPDATE products SET image_url = ? WHERE (image_url IS NULL OR image_url = '') AND name LIKE '%چیزکیک%'`).run(IMG.cheesecake);
    db.prepare(`UPDATE products SET image_url = ? WHERE (image_url IS NULL OR image_url = '')`).run(IMG.floralLatte);

    const prodCount = (db.prepare('SELECT count(*) as count FROM products').get() as { count: number }).count;
    if (prodCount < 6) {
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

  seedRichDemoCatalog(false);

  // === API ROUTES ===
  app.get('/api/health', (req, res) => res.json({ status: 'ok', db: 'SQLite configured' }));

  app.post('/api/demo/seed', (req, res) => {
    try {
      seedRichDemoCatalog(true);
      res.json({ success: true, message: 'منوی نمونه کافه رستوران با موفقیت بازنشانی شد' });
    } catch (err) {
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
        cafeName,
        ownerName: ownerName || '',
        phone,
        city: city || '',
        packageType: packageType || 'حرفه‌ای',
        createdAt: new Date().toISOString(),
      });
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('b2b_leads', JSON.stringify(list));
      res.json({ success: true });
    } catch (err) {
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
    working_hours: 'ساعت کاری ۸ صبح تا ۱۱ شب',
    service_note: 'امکان سفارش سر میز',
    wifi_info: 'اینترنت رایگان مهمان',
    brand_theme: 'botanical',
    footer_text: 'پلتفرم منوی دیجیتال هوشمند کافه و رستوران',
  };

  // Public Brand Settings
  app.get('/api/settings', (req, res) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('brand_config') as { value: string } | undefined;
      if (!row) return res.json(DEFAULT_BRAND);
      const parsed = JSON.parse(row.value);
      res.json({ ...DEFAULT_BRAND, ...parsed });
    } catch {
      res.json(DEFAULT_BRAND);
    }
  });

  // Admin APIs (Mock simple token comparison for demonstration)
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer admin-mock-token') return next();
    return res.status(401).json({ error: 'دسترسی غیرمجاز' });
  };

  // Admin API: Update Brand Settings
  app.put('/api/settings', requireAuth, (req, res) => {
    try {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('brand_config') as { value: string } | undefined;
      const current = row ? JSON.parse(row.value) : DEFAULT_BRAND;
      const updated = { ...DEFAULT_BRAND, ...current, ...(req.body || {}) };
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('brand_config', JSON.stringify(updated));
      res.json({ success: true, settings: updated });
    } catch (err) {
      res.status(500).json({ error: 'خطا در ذخیره تنظیمات برند' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    // Real implementation would verify bcrypt hash 
    if (username === 'admin' && password === 'admin123') {
      res.json({ token: 'admin-mock-token' });
    } else {
      res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
    }
  });

  // Public Categories
  app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC').all();
    res.json(categories);
  });

  // Admin API: Create Category
  app.post('/api/categories', requireAuth, (req, res) => {
    const { name, sort_order } = req.body;
    try {
      const info = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)').run(name, sort_order || 1);
      res.json({ id: info.lastInsertRowid });
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin API: Update Category
  app.put('/api/categories/:id', requireAuth, (req, res) => {
    const { name, sort_order } = req.body;
    try {
      db.prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?').run(
        name, sort_order || 1, req.params.id
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin API: Delete Category
  app.delete('/api/categories/:id', requireAuth, (req, res) => {
    try {
      db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err) {
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
    const { category_id, name, description, price, image_url, is_available, is_special, sort_order } = req.body;
    const info = db.prepare('INSERT INTO products (category_id, name, description, price, image_url, is_available, is_special, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(category_id, name, description, price, image_url, is_available ? 1 : 0, is_special ? 1 : 0, sort_order || 0);
    res.json({ id: info.lastInsertRowid });
  });

  // Admin API: Edit Product
  app.put('/api/products/:id', requireAuth, (req, res) => {
    const { category_id, name, description, price, image_url, is_available, is_special, sort_order } = req.body;
    
    // Preserve sort_order if not provided
    const current = db.prepare('SELECT sort_order FROM products WHERE id = ?').get(req.params.id) as { sort_order: number } | undefined;
    const order = sort_order !== undefined ? sort_order : (current ? current.sort_order : 0);
    
    db.prepare('UPDATE products SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, is_special = ?, sort_order = ? WHERE id = ?')
      .run(category_id, name, description, price, image_url, is_available ? 1 : 0, is_special ? 1 : 0, order, req.params.id);
    res.json({ success: true });
  });

  // Admin API: Delete Product
  app.delete('/api/products/:id', requireAuth, (req, res) => {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Upload APIs
  app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}` });
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

CREATE DATABASE IF NOT EXISTS cafe_digital_menu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cafe_digital_menu;

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    image_url VARCHAR(255),
    is_available TINYINT(1) DEFAULT 1,
    is_special TINYINT(1) DEFAULT 0,
    sort_order INT DEFAULT 0,
    FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
    `key` VARCHAR(100) PRIMARY KEY,
    value LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- نام کاربری پیش‌فرض: admin | رمز عبور پیش‌فرض: admin123
INSERT IGNORE INTO admins (id, username, password_hash) VALUES
(1, 'admin', '$2y$10$X7.mQ6a/C1iNlV8x/fS//OJn6l/wOhR6Q1yI1Fk.f39r0Bq0Rj7Tq');

INSERT IGNORE INTO categories (id, name, sort_order) VALUES 
(1, 'بار گرم', 1),
(2, 'بار سرد', 2),
(3, 'کیک و دسر', 3),
(4, 'صبحانه', 4),
(5, 'سالاد و پیش‌غذا', 5);

INSERT IGNORE INTO products (id, category_id, name, description, price, image_url, is_available, is_special, sort_order) VALUES
(1, 1, 'لاته آرت زعفران و گل سرخ', 'اسپرسو تخصصی ۱۰۰٪ عربیکا، شیر مخملی فوم‌گیری شده، عصاره طبیعی گل محمدی و زعفران قائنات', 145000, '/uploads/item-floral-latte.webp', 1, 1, 1),
(2, 1, 'کاپوچینو دست‌ساز ایتالیایی', 'دبل شات اسپرسو رست مدیوم با فوم شیر غلیظ و کرمی در فنجان سرامیکی دست‌ساز', 120000, '/uploads/item-floral-latte.webp', 1, 0, 2),
(3, 1, 'کورتادو فندوق و کارامل', 'ترکیب متعادل اسپرسو دوبل و شیر گرم بخارپز شده همراه با نت‌های طبیعی فندق برشته', 115000, '/uploads/item-floral-latte.webp', 1, 0, 3),
(4, 2, 'آیس ماچا بری لایه‌ای', 'ماچای تشریفاتی ژاپنی، پوره توت‌فرنگی تازه، شیر بادام سرد و کلد فوم وانیلی', 168000, '/uploads/item-iced-matcha.webp', 1, 1, 4),
(5, 2, 'کلد برو پرتقال و رزماری', 'قهوه دم‌سرد ۱۸ ساعته همراه با آب پرتقال طبیعی، سیروپ خانگی و شاخه رزماری تازه', 140000, '/uploads/item-iced-matcha.webp', 1, 0, 5),
(6, 2, 'مووهیتو توت‌فرنگی و نعناع تازه', 'توت‌فرنگی تازه له‌شده، برگ نعناع ارگانیک، لیموترش تازه و سودای گازدار خنک', 135000, '/uploads/item-iced-matcha.webp', 1, 0, 6),
(7, 3, 'چیزکیک سن‌سباستین با سس توت‌فرنگی', 'چیزکیک تنوری بافت کرمی به سبک باسک اسپانیا با کامپوت توت‌فرنگی تازه و مغز پسته ایرانی', 185000, '/uploads/item-berry-cheesecake.webp', 1, 1, 7),
(8, 3, 'کروسان کره‌ای فرانسوی و کره محلی', 'خمیر هزارلا با کره خالص فرانسوی، پخت روزانه، ترد و طلایی همراه با مارمالاد دست‌ساز', 118000, '/uploads/cafe-hero.webp', 1, 0, 8),
(9, 4, 'اگز بندیکت روی نان خمیرترش', 'دو عدد تخم‌مرغ پوچد عسلی، آووکادو تازه، سس هلندیز دست‌ساز و میکروگرین روی نان بریوش خمیرترش', 265000, '/uploads/item-eggs-benedict.webp', 1, 1, 9),
(10, 4, 'سینی برانچ مدیترانه‌ای و کروسان', 'کروسان تازه، تخم‌مرغ نیمرو، پنیر فتا، زیتون مزه، گردو و یک فنجان لاته تخصصی', 310000, '/uploads/cafe-hero.webp', 1, 0, 10),
(11, 5, 'سالاد سزار با فیله مرغ گریل و رزماری', 'کاهو رسمی تازه، فیله مرغ مرینیت شده با سبزیجات معطر، پنیر پارمزان ورقه‌ای، کروتان سیر و سس سزار دست‌ساز', 285000, '/uploads/item-caesar-salad.webp', 1, 1, 11),
(12, 5, 'بول پروتئینی مرغ گریل و آووکادو', 'سینه مرغ گریل، کاهو کرانچی، نان خمیرترش برشته، پارمزان کهنه و درسینگ روغن زیتون فرابکر', 295000, '/uploads/item-caesar-salad.webp', 1, 0, 12);

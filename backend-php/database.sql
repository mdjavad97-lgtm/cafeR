CREATE DATABASE IF NOT EXISTS lilicafe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lilicafe;

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0
);

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
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

INSERT IGNORE INTO admins (username, password_hash) VALUES ('admin', '$2y$10$X7.mQ6a/C1iNlV8x/fS//OJn6l/wOhR6Q1yI1Fk.f39r0Bq0Rj7Tq');

INSERT IGNORE INTO categories (id, name, sort_order) VALUES 
(1, 'بار گرم', 0),
(2, 'بار سرد', 1),
(3, 'کیک و دسر', 2),
(4, 'صبحانه', 3),
(5, 'سالاد و پیش‌غذا', 4);

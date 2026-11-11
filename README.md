# LILIMENU — منوی دیجیتال کافه و رستوران

پلتفرم منوی دیجیتال (QR) با پنل مدیریت اختصاصی، فارسی و RTL.

- **فرانت‌اند:** React 19 + Vite 6 + Tailwind CSS 4
- **پیش‌نمایش محلی:** Express + SQLite (`server.ts`)
- **نسخه تجاری (تحویل به مشتری):** PHP 8 + MySQL — `backend-php/`

## اجرای محلی (پیش‌نمایش)

```bash
npm install
cp .env.example .env   # سپس JWT_SECRET را پر کنید
npm run dev            # http://localhost:3000
```

## ساخت بسته فروش

```bash
npm run package:php    # خروجی: release-cpanel/
```

راهنمای استقرار روی هاست: [`backend-php/readme.md`](backend-php/readme.md)

## نکته‌های امنیتی

- `JWT_SECRET` الزامی است؛ کلید پیش‌فرض هاردکد وجود ندارد.
- توکن ربات تلگرام/بله هرگز در پاسخ عمومی `/api/settings` برنمی‌گردد.
- `/api/demo/seed` و `GET /api/leads` نیازمند توکن ادمین هستند.
- لاگین ادمین محدودیت تلاش دارد و رمز پیش‌فرض در فرم از پیش پر نمی‌شود.

## واحد قیمت

تمام قیمت‌ها با واحد **هزار تومان** ذخیره و نمایش داده می‌شوند (`145` = ۱۴۵٬۰۰۰ تومان).

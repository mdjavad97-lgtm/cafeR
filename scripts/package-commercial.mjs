import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const releaseDir = path.join(rootDir, 'release-cpanel');

console.log('1. Building production frontend (Vite)...');
execSync('npx vite build', { stdio: 'inherit' });

console.log('2. Assembling unified commercial PHP/MySQL package in /release-cpanel ...');
if (fs.existsSync(releaseDir)) {
  fs.rmSync(releaseDir, { recursive: true, force: true });
}
fs.mkdirSync(releaseDir, { recursive: true });

// Copy compiled frontend assets from dist/ (excluding Node server bundles)
const distDir = path.join(rootDir, 'dist');
for (const entry of fs.readdirSync(distDir)) {
  if (entry.startsWith('server.')) continue;
  fs.cpSync(path.join(distDir, entry), path.join(releaseDir, entry), { recursive: true });
}

// Copy single unified /uploads directory (WebP images + security .htaccess) from project root
const rootUploadsDir = path.join(rootDir, 'uploads');
if (fs.existsSync(rootUploadsDir)) {
  fs.cpSync(rootUploadsDir, path.join(releaseDir, 'uploads'), { recursive: true });
}

// Copy modular PHP backend, .htaccess, database.sql, and readme.md from backend-php/
const phpDir = path.join(rootDir, 'backend-php');
for (const entry of ['api', '.htaccess', 'database.sql', 'readme.md']) {
  const srcPath = path.join(phpDir, entry);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, path.join(releaseDir, entry), { recursive: true });
  }
}

console.log('✅ بسته تجاری یکپارچه بدون تکرار پوشه uploads در پوشه release-cpanel ساخته شد.');

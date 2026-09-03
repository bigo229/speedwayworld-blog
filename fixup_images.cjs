const fs = require('fs');
const path = require('path');
const { setTimeout: wait } = require('node:timers/promises');

const BASE = 'https://speedwayworld.x10.bz';
const OUT_DIR = path.resolve(process.cwd(), 'src', 'content', 'blog');
const IMG_DIR = path.resolve(process.cwd(), 'public', 'images', 'blog');
const IMG_CACHE = new Map();

async function downloadImage(imgUrl, postSlug) {
  if (IMG_CACHE.has(imgUrl)) return IMG_CACHE.get(imgUrl);
  
  let fullUrl = imgUrl;
  if (!fullUrl.startsWith('http')) {
    fullUrl = BASE + imgUrl;
  }

  let filename;
  try {
    const parsed = new URL(fullUrl);
    filename = path.basename(parsed.pathname);
    if (!filename || filename === '/') {
      IMG_CACHE.set(imgUrl, imgUrl);
      return imgUrl;
    }
  } catch (e) {
    IMG_CACHE.set(imgUrl, imgUrl);
    return imgUrl;
  }

  const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const localRel = `/images/blog/${postSlug}/${cleanName}`;
  const localPath = path.join(IMG_DIR, postSlug, cleanName);

  if (fs.existsSync(localPath)) {
    IMG_CACHE.set(imgUrl, localRel);
    return localRel;
  }

  try {
    const res = await fetch(fullUrl);
    if (!res.ok) {
      console.error(`  Image fetch fail (${res.status}): ${fullUrl}`);
      IMG_CACHE.set(imgUrl, imgUrl);
      return imgUrl;
    }
    const buf = await res.arrayBuffer();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(buf));
    console.log(`  Downloaded: ${cleanName} (${buf.byteLength} bytes)`);
    IMG_CACHE.set(imgUrl, localRel);
    return localRel;
  } catch (e) {
    console.error(`  Image download error: ${fullUrl} - ${e.message}`);
    IMG_CACHE.set(imgUrl, imgUrl);
    return imgUrl;
  }
}

const mdFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.md'));
console.log(`Processing ${mdFiles.length} markdown files for image fixup...`);

let pending = [];

async function processFile(file) {
  const slug = path.basename(file, '.md');
  const fp = path.join(OUT_DIR, file);
  let content = fs.readFileSync(fp, 'utf-8');

  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  let replaced = 0;

  while ((match = imageRegex.exec(content)) !== null) {
    const alt = match[1];
    const url = match[2];
    if (url.startsWith('/images/blog/')) continue;
    if (url.startsWith('http') && url.includes('speedwayworld.x10.bz/images/blog/')) continue;

    pending.push({ content, file, fp, slug, match, alt, url });
  }
}

async function main() {
  for (const file of mdFiles) {
    await processFile(file);
  }

  console.log(`Found ${pending.length} images to download`);

  const concurrency = 3;
  for (let i = 0; i < pending.length; i += concurrency) {
    const batch = pending.slice(i, i + concurrency);
    await Promise.all(batch.map(async ({ file, fp, slug, url, alt }) => {
      const localUrl = await downloadImage(url, slug);
      let content = fs.readFileSync(fp, 'utf-8');
      content = content.replace(url, localUrl);
      content = content.replace(/\\---/g, '---');
      fs.writeFileSync(fp, content, 'utf-8');
      console.log(`  Fixed ${path.basename(file)}: ${url} -> ${localUrl}`);
    }));
    await wait(300);
  }
  console.log('Done!');
}

main().catch(console.error);

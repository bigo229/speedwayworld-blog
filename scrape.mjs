import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const BASE = 'https://speedwayworld.x10.bz';
const OUT_DIR = path.resolve(process.cwd(), 'src', 'content', 'blog');
const IMG_DIR = path.resolve(process.cwd(), 'public', 'images', 'blog');

const SITEMAP_URL = BASE + '/sitemap.xml';

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

const turndownService = new TurndownService({
  codeBlock: true,
  emDelimiter: '*',
  strongDelimiter: '**',
  bulletListMarker: '-',
  headingStyle: 'atx',
  linkStyle: 'inlined',
});

turndownService.remove('script');
turndownService.remove('style');
turndownService.remove('svg');
turndownService.remove('iframe');

const IMG_CACHE = new Map();

async function fetchText(url, retries = 3) {
  while (retries--) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'Accept-Charset': 'utf-8',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      // Decode as UTF-8 explicitly
      return new TextDecoder('utf-8').decode(buf);
    } catch (e) {
      console.error(`Fetch failed for ${url}: ${e.message}`);
      if (retries === 0) throw e;
      await wait(2000);
    }
  }
  throw new Error('Max retries');
}

function extractUrlsFromSitemap(xml) {
  const urls = [];
  const re = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
  let m;
  const seen = new Set();
  while ((m = re.exec(xml)) !== null) {
    let u = m[1].trim();
    if (!/\/blog\//.test(u)) continue;
    // Normalize: strip trailing slash
    u = u.replace(/\/$/, '');
    if (!/\/blog\/[a-z0-9\-_]+$/i.test(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
  }
  return urls;
}

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

function extractPubDate($) {
  const timeEl = $('time.dt-published');
  const dt = timeEl.attr('datetime');
  if (dt) {
    // Parse the local date components from the ISO string, ignoring timezone.
    // e.g. "2026-06-30T21:30:00-04:00" -> use 2026-06-30 (the displayed local date).
    const m = dt.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const text = (timeEl.text() || '').trim();
  const m = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthStr = m[2];
    const year = m[3];
    const monthIdx = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
      .findIndex(x => monthStr.toLowerCase().startsWith(x));
    if (monthIdx >= 0) {
      return `${year}-${String(monthIdx+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }
  return null;
}

function extractTags($) {
  const tags = [];
  $('a.p-category').each((_, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });
  const kw = $('meta[name="keywords"]').attr('content');
  if (kw) {
    kw.split(',').map(s => s.trim()).filter(Boolean).forEach(t => {
      if (!tags.includes(t) && t.toLowerCase() !== 'blog') tags.push(t);
    });
  }
  return tags;
}

function extractAuthor($) {
  const byline = $('[itemprop="author"]').first();
  if (byline.length) return byline.text().trim() || 'SpeedwayWorld WebTeam';
  const authorMeta = $('meta[name="author"]').attr('content');
  if (authorMeta) return authorMeta;
  return 'SpeedwayWorld WebTeam';
}

function extractCategory($) {
  // No explicit category markup in sample - infer from tags or set default
  return 'British Speedway';
}

function extractFeaturedImage($) {
  const ogImg = $('meta[property="og:image"]').attr('content');
  if (ogImg) return ogImg;
  const heroStyle = $('#blog-hero').attr('style') || '';
  const match = heroStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
  if (match) return match[1];
  return null;
}

function htmlToMarkdown(html) {
  // Remove notices divs entirely
  html = html.replace(/<div class="notices[^"]*">[\s\S]*?<\/div>/g, '');
  return turndownService.turndown(html);
}

function cleanMarkdown(md) {
  return md
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeYamlString(val) {
  return String(val).replace(/"/g, '\\"');
}

function buildFrontmatter(meta) {
  let fm = '---\n';
  fm += `title: "${escapeYamlString(meta.title)}"\n`;
  if (meta.pubDate) fm += `pubDate: "${meta.pubDate}"\n`;
  if (meta.description) fm += `description: "${escapeYamlString(meta.description)}"\n`;
  fm += `author: "${escapeYamlString(meta.author)}"\n`;
  if (meta.tags.length) {
    fm += `tags:\n`;
    for (const t of meta.tags) fm += `  - "${escapeYamlString(t)}"\n`;
  }
  if (meta.category) fm += `category: "${escapeYamlString(meta.category)}"\n`;
  if (meta.heroImage) fm += `heroImage: "${meta.heroImage}"\n`;
  fm += '---\n\n';
  return fm;
}

async function processPost(url) {
  // url: https://speedwayworld.x10.bz/blog/slug
  const parsed = new URL(url);
  let slug = parsed.pathname.replace(/^\/blog\//, '').replace(/\/$/, '');
  if (!slug) slug = parsed.pathname.split('/').filter(Boolean).pop();
  console.log(`Processing: ${slug}`);

  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html, { decodeEntities: true });

    let title = $('h1').first().text().trim();
    if (!title) title = $('title').text().replace(/\s*\|\s*Speedway\s*World/i, '').trim();
    title = title.replace(/&amp;/g, '&');

    const pubDate = extractPubDate($) || '2026-01-01';
    const tags = extractTags($);
    const author = extractAuthor($);
    const category = extractCategory($);
    const description = ($('meta[name="description"]').attr('content') || '').replace(/\s+/g, ' ').trim();

    // Content extraction
    const contentEl = $('.e-content').first();
    let body = '';
    if (contentEl.length) {
      let html = contentEl.html() || '';
      // Remove notices
      html = html.replace(/<div class="notices[^"]*">[\s\S]*?<\/div>/g, '');
      // Convert first <p><img ...></p> (often the inline hero) - keep but convert to MD
      body = htmlToMarkdown(html);
    }

    // Hero image - prefer first <p><img> in content
    let heroImgUrl = extractFeaturedImage($);
    // Prefer inline first image if it's clearly the hero
    const firstInlineImg = contentEl.find('img').first().attr('src');
    if (firstInlineImg) {
      // Compare - if same as featured, use; if different, prefer the inline
      heroImgUrl = firstInlineImg;
    }

    let heroImagePath = null;
    if (heroImgUrl) {
      const localPath = await downloadImage(heroImgUrl, slug);
      if (localPath && localPath.startsWith('/images/blog/')) heroImagePath = localPath;
    }

    // If hero image was downloaded, remove it from body to avoid duplication
    if (heroImagePath) {
      // Remove the first image markdown link in the body
      body = body.replace(/!\[[^\]]*\]\([^)]+\)\s*/, '');
    }

    body = cleanMarkdown(body);

    const fm = buildFrontmatter({ title, pubDate, description, author, tags, category, heroImage: heroImagePath });
    const mdPath = path.join(OUT_DIR, `${slug}.md`);
    fs.writeFileSync(mdPath, fm + body + '\n', { encoding: 'utf-8' });
    console.log(`  -> Wrote ${mdPath}`);
    return { slug, ok: true };
  } catch (e) {
    console.error(`FAILED: ${slug} - ${e.message}`);
    return { slug, ok: false, error: e.message };
  }
}

async function main() {
  console.log('Fetching sitemap...');
  const sitemapXml = await fetchText(SITEMAP_URL);
  const urls = extractUrlsFromSitemap(sitemapXml);
  console.log(`Found ${urls.length} blog post URLs in sitemap`);

  const concurrency = 4;
  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(processPost));
    for (const r of results) {
      if (r.ok) succeeded++; else { failed++; errors.push(r); }
    }
    if (i + concurrency < urls.length) await wait(500);
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total posts on live site: ${urls.length}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  if (errors.length) {
    console.log(`Errors:`);
    for (const e of errors) console.log(`  - ${e.slug}: ${e.error}`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
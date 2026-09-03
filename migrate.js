import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const BASE = 'https://speedwayworld.x10.bz';
const OUT_DIR = path.resolve(process.cwd(), 'src', 'content', 'blog');
const IMG_DIR = path.resolve(process.cwd(), 'public', 'images', 'blog');

const urlsFile = path.resolve(process.env.TEMP || '/tmp', 'post_urls.txt');
let rawBuffer = fs.readFileSync(urlsFile);
let rawText = new TextDecoder('utf-16le').decode(rawBuffer);
const rawUrls = rawText.split(/\r?\n/).filter(Boolean);
const urls = rawUrls.map(u => u.replace(/"$/, '').trim()).filter(u => u.startsWith('/blog/'));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

const turndownService = new TurndownService({
  codeBlock: true,
  emDelimiter: '*',
  strongDelimiter: '**',
  bulletListMarker: '-',
  linkStyle: 'inlined',
});

turndownService.addRule('images', {
  filter: 'img',
  replacement: (content, node) => {
    const src = node.getAttribute('src') || '';
    const alt = node.getAttribute('alt') || '';
    const title = node.getAttribute('title') || '';
    if (!src) return '';
    const altText = title || alt;
    return `![${altText}](${src})`;
  },
});

turndownService.addRule('notices', {
  filter: (node) => node.tagName === 'DIV' && /notices/.test(node.className || ''),
  replacement: () => '',
});

turndownService.remove('script');
turndownService.remove('style');
turndownService.remove('svg');
turndownService.remove('iframe');

function escapeFrontmatter(val) {
  if (typeof val !== 'string') return val;
  if (val.includes('\n')) {
    return val.split('\n').map(l => l.trim() ? `  ${l}` : '').join('\n');
  }
  return val;
}

async function fetchPage(url) {
  let retries = 3;
  while (retries--) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Migration)' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      console.error(`Fetch failed for ${url}: ${e.message}`);
      if (retries === 0) throw e;
      await wait(3000);
    }
  }
  throw new Error('Max retries');
}

async function downloadImage(imgUrl, postSlug) {
  const fullUrl = imgUrl.startsWith('http') ? imgUrl : BASE + imgUrl;
  const parsed = new URL(fullUrl);
  let filename = path.basename(parsed.pathname);
  if (!filename) return null;
  const localPath = path.join(IMG_DIR, postSlug, filename);
  try {
    const res = await fetch(fullUrl);
    if (!res.ok) { console.error(`Image fetch failed ${fullUrl}: ${res.status}`); return null; }
    const buf = await res.arrayBuffer();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(buf));
    return `/images/blog/${postSlug}/${filename}`;
  } catch (e) {
    console.error(`Image download error ${fullUrl}: ${e.message}`);
    return null;
  }
}

function extractPubDate($) {
  const timeEl = $('time.dt-published');
  const dt = timeEl.attr('datetime');
  if (dt) return new Date(dt).toISOString().split('T')[0];
  const text = timeEl.text().trim();
  const parsed = new Date(text + ' 2026');
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return '2026-07-25';
}

function extractTags($) {
  const keywords = $('meta[name="keywords"]').attr('content') || '';
  const tags = keywords.split(',').map(t => t.trim()).filter(t => t && t !== 'blog');
  return tags;
}

function extractAuthor($) {
  const byline = $('.byline, .author, .post-author, [itemprop="author"]').first();
  if (byline.length) return byline.text().trim() || 'SpeedwayWorld WebTeam';
  const authorMeta = $('meta[name="author"]').attr('content');
  if (authorMeta) return authorMeta;
  return 'SpeedwayWorld WebTeam';
}

function extractContent($) {
  let content = $('.e-content').first();
  if (content.length === 0) content = $('main .content-item').first();
  if (content.length === 0) content = $('article').first();
  if (content.length === 0) content = $('body').find('main').first();

  let html = content.html() || '';

  html = html.replace(/<div class="notices[^"]*">[\s\S]*?<\/div>/g, '');
  html = html.replace(/<hr\s*\/?>/g, '\n\n---\n\n');

  const mdBody = turndownService.turndown(html);
  const cleaned = mdBody
    .replace(/!\[]\([^)]+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return cleaned;
}

function extractDescription($) {
  const desc = $('meta[name="description"]').attr('content') || '';
  return desc.replace(/\s+/g, ' ').trim();
}

function extractFeaturedImage($) {
  const ogImg = $('meta[property="og:image"]').attr('content');
  if (ogImg) return ogImg;
  const heroStyle = $('#blog-hero').attr('style') || '';
  const match = heroStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
  if (match) return match[1];
  const firstImg = $('img').first().attr('src');
  return firstImg || null;
}

async function processPost(url) {
  const fullUrl = url.startsWith('http') ? url : BASE + url;
  const slug = url.replace(/^\/blog\//, '').replace(/\/$/, '');
  console.log(`Processing: ${slug}`);

  try {
    const html = await fetchPage(fullUrl);
    const $ = cheerio.load(html, { decodeEntities: true });

    let title = $('h1').first().text().trim() || $('title').text().replace('| Grav', '').trim();
    title = title.replace(/&amp;/g, '&');

    const pubDate = extractPubDate($);
    const tags = extractTags($);
    const author = extractAuthor($);
    const body = extractContent($);
    const description = extractDescription($);
    let imgUrl = extractFeaturedImage($);

    let heroImagePath = null;
    if (imgUrl) {
      const localPath = await downloadImage(imgUrl, slug);
      if (localPath) heroImagePath = localPath;
    }

    const frontmatter = {
      title,
      pubDate,
      description,
      author,
      tags: tags.length ? tags : [],
      heroImage: heroImagePath,
    };

    let fm = '---\n';
    for (const [k, v] of Object.entries(frontmatter)) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        fm += `${k}:\n`;
        for (const item of v) fm += `  - ${JSON.stringify(String(item))}\n`;
      } else if (typeof v === 'string' && v.includes('\n')) {
        fm += `${k}:\n${escapeFrontmatter(v)}\n`;
      } else {
        fm += `${k}: ${JSON.stringify(v)}\n`;
      }
    }
    fm += '---\n\n';

    const mdPath = path.join(OUT_DIR, `${slug}.md`);
    fs.writeFileSync(mdPath, fm + body + '\n');
    console.log(`  -> Wrote ${mdPath}`);
  } catch (e) {
    console.error(`FAILED: ${slug} - ${e.message}`);
  }
}

async function main() {
  console.log(`Total posts to process: ${urls.length}`);
  const concurrency = 5;
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    await Promise.all(batch.map(processPost));
    await wait(500);
  }
  console.log('Done!');
}

main().catch(console.error);

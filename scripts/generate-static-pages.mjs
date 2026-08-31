import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const templatePath = path.join(distDir, 'index.html');
const databasePath = path.join(rootDir, 'db.json');
const siteUrl = String(process.env.SITE_URL || 'https://storecenter.com.br').replace(/\/$/, '');

const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const template = fs.readFileSync(templatePath, 'utf8');
const now = Date.now();

function parseDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const parsed = brazilian
    ? new Date(Date.UTC(+brazilian[3], +brazilian[2] - 1, +brazilian[1], +(brazilian[4] || 0), +(brazilian[5] || 0), +(brazilian[6] || 0)))
    : new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getPostDate(post) {
  for (const value of [post.publishedAt, post.updatedAt, post.createdAt, post.date]) {
    const parsed = parseDate(value);
    if (parsed) return parsed;
  }
  return new Date(0);
}

function isPublished(post) {
  const status = String(post.status || '').trim().toLowerCase();
  const published = status === 'published' || status === 'no ar' || status === 'no_ar' || post.published === true || post.published === 'true';
  return published && post.isTestPost !== true && post.isTestPost !== 'true' && getPostDate(post).getTime() <= now;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function absoluteUrl(value, fallback) {
  try {
    return new URL(String(value || fallback), `${siteUrl}/`).href;
  } catch {
    return new URL(fallback, `${siteUrl}/`).href;
  }
}

function articleSeo(post, slug) {
  const titleText = post.seoTitle || post.title;
  const pageTitle = `${titleText} | Store Center News`;
  const description = post.seoDescription || post.subtitle || 'Notícias e análises do Store Center News.';
  const canonical = `${siteUrl}/noticia/${encodeURIComponent(slug)}`;
  const image = absoluteUrl(post.image, '/assets/editorial/geral.svg');
  const publishedAt = getPostDate(post).toISOString();
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description,
    image: [image],
    datePublished: publishedAt,
    dateModified: parseDate(post.updatedAt)?.toISOString() || publishedAt,
    author: { '@type': 'Organization', name: post.author || 'Redação Store Center' },
    publisher: { '@type': 'Organization', name: 'Store Center News', url: siteUrl },
    mainEntityOfPage: canonical
  }).replace(/</g, '\\u003c');

  return `<!-- SEO_DYNAMIC_START -->
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Store Center News" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="article:published_time" content="${escapeHtml(publishedAt)}" />
    <meta property="article:section" content="${escapeHtml(post.category || '')}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${jsonLd}</script>
    <!-- SEO_DYNAMIC_END -->`;
}

const posts = (Array.isArray(database.posts) ? database.posts : [])
  .filter(isPublished)
  .map(post => ({ ...post, resolvedSlug: String(post.slug || slugify(post.title)) }))
  .filter(post => post.resolvedSlug);

for (const post of posts) {
  const articleDir = path.join(distDir, 'noticia', post.resolvedSlug);
  const articleHtml = template.replace(
    /<!-- SEO_DYNAMIC_START -->[\s\S]*?<!-- SEO_DYNAMIC_END -->/,
    articleSeo(post, post.resolvedSlug)
  );
  fs.mkdirSync(articleDir, { recursive: true });
  fs.writeFileSync(path.join(articleDir, 'index.html'), articleHtml, 'utf8');
}

const sitemapEntries = [
  `  <url><loc>${siteUrl}/</loc></url>`,
  ...posts.map(post => `  <url><loc>${siteUrl}/noticia/${encodeURIComponent(post.resolvedSlug)}</loc><lastmod>${getPostDate(post).toISOString()}</lastmod></url>`)
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(distDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
console.log(`[SEO] ${posts.length} páginas de matérias, sitemap.xml e robots.txt gerados em ${distDir}.`);

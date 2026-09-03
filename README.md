# SpeedwayWorld Blog

Astro-based static site migrated from GravCMS. Deployed to Cloudflare Pages.

## Features

- 119 migrated blog posts with images
- Content collections with tags and categories
- Contact form (Formspree placeholder)
- Decap CMS admin at `/admin`
- Tag archive pages
- RSS feed and sitemap
- Responsive design with Atkinson font

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub
2. In Cloudflare Dashboard, go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
3. Select this repo
4. Build settings:
   - **Build command**: `npm run build`
   - **Build output**: `dist`
   - **Node version**: `22.x`
5. Click **Save and Deploy**

No API keys required.

## Admin (Decap CMS)

Visit `/admin` to manage blog posts.

Before first use:
1. Create a GitHub OAuth App at https://github.com/settings/developers
   - Homepage URL: `https://speedwayworld.x10.bz`
   - Authorization callback URL: `https://speedwayworld.x10.bz/admin/`
2. Update `public/admin/config.yml` with your repo owner/name and OAuth client ID
3. Set `ADMIN_PASSWORD` in Cloudflare Pages environment variables (optional, for API proxy)

## Formspree

Replace the placeholder Formspree endpoint in `src/pages/contact.astro` with your actual form ID from https://formspree.io.

## Content

Blog posts are in `src/content/blog/` as Markdown files with YAML frontmatter.

Frontmatter fields:
- `title` (string)
- `description` (string, optional)
- `pubDate` (date)
- `updatedDate` (date, optional)
- `heroImage` (string, optional)
- `author` (string, default: `SpeedwayWorld WebTeam`)
- `tags` (array of strings, optional)
- `category` (string, optional)

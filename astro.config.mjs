// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import path from 'path';

// https://astro.build
export default defineConfig({
	site: 'https://speedwayworld-blog.bigo229.workers.dev/',
	integrations: [
		mdx(), 
		sitemap({
			filter: (page) => !page.includes('/admin')
		})
	],
	vite: {
		resolve: {
			alias: {
				'@components': path.resolve('./src/components')
			}
		}
	}
});

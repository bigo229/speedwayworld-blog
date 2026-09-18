// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://pages.dev', // Ensure this matches your production Pages URL!
	integrations: [
		mdx(), 
		sitemap({
			filter: (page) => !page.includes('/admin')
		})
	]
});

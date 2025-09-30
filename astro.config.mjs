import { defineConfig } from 'astro/config';
import remarkWikiLink from "@braindb/remark-wiki-link";

function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default defineConfig({
  integrations: [],
  markdown: {
    remarkPlugins: [
      [
        remarkWikiLink,
        {
          linkTemplate: ({ slug, alias }) => {
            const [slugWithoutAnchor, anchor] = slug.split("#")
            const normalizedPath = `/${normalizeSlug(slugWithoutAnchor)}/`;
            const href = anchor ? `${normalizedPath}#${anchor}` : normalizedPath;

            return {
              hName: "a",
              hProperties: {
                href: href,
              },
              hChildren: [
                {
                  type: "text",
                  value: alias || slug,
                },
              ],
            };
          },
        },
      ],
    ],
  },
});
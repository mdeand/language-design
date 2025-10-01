import { defineConfig } from 'astro/config';
import remarkWikiLink from "@braindb/remark-wiki-link";
import tailwindcss from "@tailwindcss/vite";
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

function normalizeSlug(slug) {
  return slug
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findMarkdownFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function mkWikiLinkMap() {
  const contentDir = path.join(process.cwd(), 'src', 'content');
  const markdownFiles = findMarkdownFiles(contentDir);
  const wikiLinkMap = new Map();

  for (const filePath of markdownFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter } = matter(content);

    const relativePath = path.relative(contentDir, filePath);
    const pathWithoutExt = relativePath.replace(/\.md$/, '');

    let url;
    if (pathWithoutExt === 'index') {
      url = '/';
    } else if (pathWithoutExt.endsWith('/index')) {
      // NOTE(meowesque): Treat index.md files as directory roots
      const dirPath = pathWithoutExt.replace('/index', '');
      url = `/${normalizeSlug(dirPath)}/`;
    } else {
      const pathParts = pathWithoutExt.split('/');
      const normalizedParts = pathParts.map(part => normalizeSlug(part));
      url = `/${normalizedParts.join('/')}/`;
    }

    if (frontmatter.title) {
      wikiLinkMap.set(frontmatter.title, url);
      wikiLinkMap.set(normalizeSlug(frontmatter.title), url);
    }

    const fileName = path.basename(pathWithoutExt);
    if (fileName !== 'index') {
      wikiLinkMap.set(fileName, url);
      wikiLinkMap.set(normalizeSlug(fileName), url);
    }

    wikiLinkMap.set(pathWithoutExt, url);
    wikiLinkMap.set(normalizeSlug(pathWithoutExt), url);
  }

  return wikiLinkMap;
}

const wikiLinkMap = mkWikiLinkMap();

const wikiLinkTemplate = ({ slug, alias }) => {
  const [slugWithoutAnchor, anchor] = slug.split("#");

  let url = wikiLinkMap.get(slugWithoutAnchor) ||
    wikiLinkMap.get(normalizeSlug(slugWithoutAnchor));

  if (!url) {
    url = `/${normalizeSlug(slugWithoutAnchor)}/`;
  }

  const href = anchor ? `${url.replace(/\/$/, '')}#${anchor}` : url;

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
};

export default defineConfig({
  output: "static",
  integrations: [],
  markdown: {
    remarkPlugins: [
      [
        remarkWikiLink,
        {
          linkTemplate: wikiLinkTemplate,
        },
      ],
    ],
  },

  vite: {
    plugins: [tailwindcss()]
  }
});
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ base: "./src/content", pattern: "**/*.md" }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { docs };
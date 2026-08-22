import { z } from "zod";

// ─── helpers ──────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ─── create ───────────────────────────────────────────────────────────────────

export const createArticleSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(200),
    slug: z
      .string()
      .regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens only")
      .max(220)
      .optional(), // auto-generated from title if omitted
    excerpt: z.string().max(500).optional(),
    content: z.string().min(1, "Content is required"),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    tags: z
      .array(z.string().uuid("Each tag must be a valid UUID"))
      .max(10)
      .optional(),
  }),
});

// ─── update ───────────────────────────────────────────────────────────────────

export const updateArticleSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid article ID"),
  }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    slug: z.string().regex(slugRegex).max(220).optional(),
    excerpt: z.string().max(500).optional(),
    content: z.string().min(1).optional(),
    categoryId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().uuid()).max(10).optional(),
  }),
});

// ─── publish ──────────────────────────────────────────────────────────────────

export const publishArticleSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid article ID"),
  }),
});

// ─── list (query filters) ─────────────────────────────────────────────────────

export const listArticlesSchema = z.object({
  query: z.object({
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    categoryId: z.string().uuid().optional(),
    tag: z.string().optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    sortBy: z.enum(["createdAt", "publishedAt", "views"]).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
  }),
});

// ─── slug / id params ─────────────────────────────────────────────────────────

export const articleSlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
  }),
});

export const articleIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid article ID"),
  }),
});

// ─── inferred types ───────────────────────────────────────────────────────────

export type CreateArticleInput = z.infer<typeof createArticleSchema>["body"];
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>["body"];
export type ListArticlesQuery = z.infer<typeof listArticlesSchema>["query"];

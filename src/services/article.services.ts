import { PrismaClient, ArticleStatus, Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import slugify from "slugify";
import type {
  CreateArticleInput,
  UpdateArticleInput,
  ListArticlesQuery,
} from "../validations/article.validation";
import {
  cacheRemember,
  cacheKeyFromQuery,
  invalidateArticleCaches,
} from "../utils/cache";

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────

function computeReadTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  let base = slugify(title, { lower: true, strict: true });
  let candidate = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.article.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (!existing) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

async function uploadCoverImage(filePath: string, publicId?: string): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: "samriddh-realty/articles",
    public_id: publicId,
    overwrite: true,
    transformation: [{ width: 1200, height: 630, crop: "fill", quality: "auto" }],
  });
  return result.secure_url;
}

// ─── create ───────────────────────────────────────────────────────────────────

export async function createArticle(
  data: CreateArticleInput,
  coverImagePath?: string
) {
  const slug = data.slug ?? (await generateUniqueSlug(data.title));
  const readTimeMin = computeReadTime(data.content);

  let coverImage: string | undefined;
  if (coverImagePath) {
    coverImage = await uploadCoverImage(coverImagePath, `article-${slug}`);
  }

  const article = await prisma.article.create({
    data: {
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content,
        readTimeMin,
        coverImage,
        categoryId: data.categoryId ?? null,
        tags: data.tags?.length
        ? {
            connect: data.tags.map((id) => ({ id })),
            }
        : undefined,
    },
    include: {
        category: true,
        tags: true,
    },
    });

  await invalidateArticleCaches();
  return article;
}

// ─── list (admin — any status) ────────────────────────────────────────────────

export async function listArticles(query: ListArticlesQuery) {
  const {
  status,
  categoryId,
  tag,
  search,
  page = 1,
  limit = 10,
  sortBy = "createdAt",
  order = "desc",
} = query;
 const skip = (Number(page) - 1) * Number(limit);

  const where: Prisma.ArticleWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(tag ? { tags: { some: { slug: tag } } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { excerpt: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [articles, total] = await prisma.$transaction([
    prisma.article.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: {
    [sortBy ?? "createdAt"]: order ?? "desc",
    },
      include: {
        category: true,
        tags: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  return {
    articles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── list (public — published only) ──────────────────────────────────────────

export async function listPublishedArticles(query: ListArticlesQuery) {
  const cacheKey = cacheKeyFromQuery("articles:public", query as Record<string, unknown>);
  return cacheRemember(cacheKey, 120, () =>
    listArticles({ ...query, status: "PUBLISHED" })
  );
}

// ─── get by slug ──────────────────────────────────────────────────────────────

export async function getArticleBySlug(slug: string, incrementViews = false) {
  const article = incrementViews
    ? await prisma.article.findFirst({
        where: { slug, deletedAt: null },
        include: {
          category: true,
          tags: true,
        },
      })
    : await cacheRemember(`article:slug:${slug}`, 180, () =>
        prisma.article.findFirst({
          where: { slug, deletedAt: null },
          include: {
            category: true,
            tags: true,
          },
        })
      );

  if (!article) return null;

  if (incrementViews) {
    await prisma.article.update({
      where: { id: article.id },
      data: { views: { increment: 1 } },
    });
  }

  return article;
}

// ─── get by ID (admin) ────────────────────────────────────────────────────────

export async function getArticleById(id: string) {
  return prisma.article.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      tags: true,
    },
  });
}

// ─── update ───────────────────────────────────────────────────────────────────

export async function updateArticle(
  id: string,
  data: UpdateArticleInput,
  coverImagePath?: string
) {
  const existing = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  const slug =
    data.slug ??
    (data.title && data.title !== existing.title
      ? await generateUniqueSlug(data.title, id)
      : existing.slug);

  const readTimeMin = data.content
    ? computeReadTime(data.content)
    : existing.readTimeMin;

  let coverImage = existing.coverImage;
  if (coverImagePath) {
    coverImage = await uploadCoverImage(coverImagePath, `article-${slug}`);
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content,
      readTimeMin: readTimeMin ?? undefined,
      coverImage,
      categoryId: data.categoryId,
      ...(data.tags !== undefined
        ? { tags: { set: data.tags.map((tagId) => ({ id: tagId })) } }
        : {}),
    },
    include: { category: true, tags: true },
  });

  await invalidateArticleCaches();
  return article;
}

// ─── publish ──────────────────────────────────────────────────────────────────

export async function publishArticle(id: string) {
  const existing = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  if (!existing.coverImage) {
    throw new Error("Article must have a cover image before publishing");
  }
  if (!existing.excerpt) {
    throw new Error("Article must have an excerpt before publishing");
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      status: ArticleStatus.PUBLISHED,
      publishedAt: existing.publishedAt ?? new Date(),
    },
    include: { category: true, tags: true },
  });
  await invalidateArticleCaches();
  return article;
}

// ─── unpublish (revert to draft) ──────────────────────────────────────────────

export async function unpublishArticle(id: string) {
  const existing = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  const article = await prisma.article.update({
    where: { id },
    data: { status: ArticleStatus.DRAFT },
  });
  await invalidateArticleCaches();
  return article;
}

// ─── soft delete ──────────────────────────────────────────────────────────────

export async function deleteArticle(id: string) {
  const existing = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  const article = await prisma.article.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  await invalidateArticleCaches();
  return article;
}

// ─── cover image upload (standalone endpoint) ─────────────────────────────────

export async function updateCoverImage(id: string, filePath: string) {
  const existing = await prisma.article.findFirst({ where: { id, deletedAt: null } });
  if (!existing) return null;

  const coverImage = await uploadCoverImage(filePath, `article-${existing.slug}`);

  const article = await prisma.article.update({
    where: { id },
    data: { coverImage },
  });
  await invalidateArticleCaches();
  return article;
}

// ─── categories ───────────────────────────────────────────────────────────────

export async function listCategories() {
  return cacheRemember("articles:categories", 1800, () =>
    prisma.articleCategory.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { name: "asc" },
    })
  );
}

// ─── tags ─────────────────────────────────────────────────────────────────────

export async function listTags() {
  return cacheRemember("articles:tags", 1800, () =>
    prisma.articleTag.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { name: "asc" },
    })
  );
}

import { Request, Response, NextFunction } from "express";
import * as articleService from "../services/article.services";
import type { ListArticlesQuery } from "../validations/article.validation";

// ─── admin: create ────────
// ────────────────────────────────────────────────────

// interface SlugParams {
//   slug: string;
// }

// interface IdParams{
//     id:string;
// }

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const coverImagePath = (req.file as Express.Multer.File | undefined)?.path;

    const article = await articleService.createArticle(req.body, coverImagePath);

    res.status(201).json({
      success: true,
      data: article,
    });
  } catch (err) {
    next(err);
  }
}

// ─── admin: list all ─────────────────────────────────────────────────────────

export async function listAll(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await articleService.listArticles(
      req.query as unknown as ListArticlesQuery
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

// ─── public: list published ───────────────────────────────────────────────────

export async function listPublished(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await articleService.listPublishedArticles(
      req.query as unknown as ListArticlesQuery
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
// ─── public: get by slug (increments views) ───────────────────────────────────

export async function getBySlug(req: Request, res: Response, next: NextFunction) {
    const slug = req.params.slug as string;

  try {
    const article = await articleService.getArticleBySlug(slug, true);

    if (!article) {
    res.status(404).json({
        success: false,
        message: "Article not found",
    });
    return;
    }

    res.json({
    success: true,
    data: article,
    });
  } catch (err) {
    next(err);
  }
}

// ─── admin: get by ID ─────────────────────────────────────────────────────────

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    const article = await articleService.getArticleById(id);

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (err) {
    next(err);
  }
}

// ─── admin: update ────────────────────────────────────────────────────────────

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const coverImagePath = (req.file as Express.Multer.File | undefined)?.path;

    const article = await articleService.updateArticle(
      id,
      req.body,
      coverImagePath
    );

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (err) {
    next(err);
  }
}

// ─── admin: publish ───────────────────────────────────────────────────────────

export async function publish(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    const article = await articleService.publishArticle(id);

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("must have")) {
      res.status(422).json({
        success: false,
        message: err.message,
      });
      return;
    }

    next(err);
  }
}

// ─── admin: unpublish ────────────────────────────────────────────────────────

export async function unpublish(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    const article = await articleService.unpublishArticle(id);

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    res.json({
      success: true,
      data: article,
    });
  } catch (err) {
    next(err);
  }
}

// ─── admin: soft delete ───────────────────────────────────────────────────────

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    const article = await articleService.deleteArticle(id);

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Article deleted",
    });
  } catch (err) {
    next(err);
  }
}

// ─── admin: upload cover image ────────────────────────────────────────────────

export async function uploadCover(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
      return;
    }

    const article = await articleService.updateCoverImage(
      id,
      req.file.path
    );

    if (!article) {
      res.status(404).json({
        success: false,
        message: "Article not found",
      });
      return;
    }

    res.json({
      success: true,
      data: {
        coverImage: article.coverImage,
      },
    });
  } catch (err) {
    next(err);
  }
}
// ─── public: categories ───────────────────────────────────────────────────────

export async function getCategories(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await articleService.listCategories();

    res.json({
      success: true,
      data: categories,
    });
  } catch (err) {
    next(err);
  }
}

// ─── public: tags ─────────────────────────────────────────────────────────────

export async function getTags(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tags = await articleService.listTags();

    res.json({
      success: true,
      data: tags,
    });
  } catch (err) {
    next(err);
  }
}

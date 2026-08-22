import { Router } from "express";
import multer from "multer";
import * as articleController from "../controllers/article.controller";
import { validate } from "../middlewares/article.middleware";
import { RequestHandler } from "express";
import {
  createArticleSchema,
  updateArticleSchema,
  publishArticleSchema,
  listArticlesSchema,
  articleSlugSchema,
  articleIdSchema,
} from "../validations/article.validation";

// ─── reuse your existing auth middleware ──────────────────────────────────────
// Import from wherever yours lives, e.g.:
// import { authenticate, requireAdmin } from "../../middlewares/auth.middlewar";

// ─── multer: reuse your existing Cloudinary storage ──────────────────────────
// If you have a shared multer/cloudinary config, import it.
// Otherwise use diskStorage as a temporary buffer before Cloudinary upload:
const upload = multer({
  dest: "/tmp/uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// List published articles (with optional ?search=, ?tag=, ?categoryId=, ?page=, ?limit=)
router.get(
  "/public",
  validate(listArticlesSchema),
  articleController.listPublished
);

// Single article by slug (increments views)
router.get(
  "/public/:slug",
  validate(articleSlugSchema),
  articleController.getBySlug
);

// Categories list
router.get("/categories", articleController.getCategories);

// Tags list
router.get("/tags", articleController.getTags);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES  (JWT + ADMIN role required)
// ─────────────────────────────────────────────────────────────────────────────

// Create article (with optional cover image)
router.post(
  "/",
//   authenticate,
//   requireAdmin,
  upload.single("coverImage"),
  validate(createArticleSchema),
  articleController.create
);

// List all articles (any status) — for CMS dashboard
router.get(
  "/",
//   authenticate,
//   requireAdmin,
  validate(listArticlesSchema),
  articleController.listAll
);

// Get single article by ID — for CMS edit page
router.get(
  "/:id",
//   authenticate,
//   requireAdmin,
  validate(articleIdSchema),
  articleController.getById
);

// Update article (with optional new cover image)
router.put(
  "/:id",
//   authenticate,
//   requireAdmin,
  upload.single("coverImage"),
  validate(updateArticleSchema),
  articleController.update
);

// Publish article
router.post(
  "/:id/publish",
//   authenticate,
//   requireAdmin,
  validate(publishArticleSchema),
  articleController.publish
);

// Unpublish (revert to DRAFT)
router.post(
  "/:id/unpublish",
//   authenticate,
//   requireAdmin,
  validate(publishArticleSchema),
  articleController.unpublish
);

// Upload / replace cover image only
router.post(
  "/:id/cover",
//   authenticate,
//   requireAdmin,
  upload.single("coverImage"),
  validate(articleIdSchema),
  articleController.uploadCover
);

// Soft delete
router.delete(
  "/:id",
//   authenticate,
//   requireAdmin,
  validate(articleIdSchema),
  articleController.remove
);

export default router;

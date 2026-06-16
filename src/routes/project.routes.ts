import { Router } from "express";
import {
  getProjects,
  getFeaturedProjects,
  getProjectBySlug,
  getProjectsByBuilder,
} from "../controllers/project.controller";

import {
  createProject,
  updateProject,
  deleteProject,
  uploadProjectImages,
  updateProjectConfigs
} from "../controllers/project.create.controller";

import { createPropertyForProject } from "../controllers/property.controller";

import { protect, adminOnly } from "../middlewares/auth.middleware";
import upload from "../middlewares/upload.middleware";

const router = Router();

// IMPORTANT — static routes must come before dynamic /:slug

router.get("/featured",              getFeaturedProjects);   // GET /projects/featured
router.get("/builder/:builderSlug",  getProjectsByBuilder);  // GET /projects/builder/kalinga-constructions
router.get("/",                      getProjects);           // GET /projects
router.get("/:slug",                 getProjectBySlug);      // GET /projects/kalinga-greenfields-patia

router.post(
  "/",
  upload.array("images", 20),
  createProject
);

router.post(
  "/projects/:id/configs",
  updateProjectConfigs
);

 
router.patch("/:id",  protect, adminOnly, updateProject);
router.delete("/:id", protect, adminOnly, deleteProject);
 
router.post(
  "/:id/images",
  protect,
  adminOnly,
  upload.array("images", 20),
  uploadProjectImages
);

//router.post("/:projectId/properties", createPropertyForProject);
export default router;

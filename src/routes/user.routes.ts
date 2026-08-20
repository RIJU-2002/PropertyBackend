import { Router } from "express";
import {
  createUserController,
  getProfile,
  updateProfile,
  getSavedProperties,
  saveProperty,
  getSavedProjects,
  saveProject,
} from "../controllers/user.controller";
import { protect, adminOnly } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", protect, adminOnly, createUserController);

// All user routes require login
router.get("/me",                                  protect, getProfile);
router.patch("/me",                                protect, updateProfile);

// Saved / shortlisted
router.get("/me/saved/properties",                 protect, getSavedProperties);
router.post("/me/saved/properties/:propertyId",    protect, saveProperty);

router.get("/me/saved/projects",                   protect, getSavedProjects);
router.post("/me/saved/projects/:projectId",       protect, saveProject);

export default router;
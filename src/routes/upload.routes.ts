import { Router } from "express";

import upload from "../middlewares/upload.middleware";

import { protect } from "../middlewares/auth.middleware";

import {
  uploadImage,
} from "../controllers/upload.controller";

const router = Router();

router.post(
  "/",

  upload.single("image"),

  uploadImage
);

export default router;
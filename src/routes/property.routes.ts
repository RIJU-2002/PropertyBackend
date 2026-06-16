import { Router } from "express";
import { getProperties } from "../controllers/property.controller";
import {createProperty,updateProperty,deleteProperty,uploadImages,removeImage} from "../controllers/property.create.controller"
import { protect,adminOnly } from "../middlewares/auth.middleware";
import upload from "../middlewares/upload.middleware";

const router = Router();

router.get("/",        getProperties);
//router.get("/:slug", getPropertyBySlug);
router.post("/:id/images", protect, upload.array("images", 10), uploadImages);   //to add images after creating property
router.delete("/images/:imageId", protect, removeImage);
router.post("/",      protect,adminOnly,upload.array("images", 10), createProperty); // 🔒 login required
router.patch("/:id",  protect,adminOnly, updateProperty); // 🔒 login required
router.delete("/:id", protect,adminOnly, deleteProperty); // 🔒 login required

export default router;
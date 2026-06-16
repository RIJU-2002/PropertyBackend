import { Request, Response } from "express";
import { z } from "zod";
import {
  addProperty,
  editProperty,
  removeProperty,
  addImagesToProperty,
  deletePropertyImage,
} from "../services/property.create.service";
import {
  createPropertySchema,
  updatePropertySchema,
} from "../validations/property.validation";

// ============================================================
// HELPER — serialize BigInt safely
// ============================================================

const safe = (data: any) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

// ============================================================
// HELPER — parse multipart form fields
// When sending multipart/form-data, all fields arrive as strings.
// This converts them back to the right types before Zod validation.
// ============================================================

const parseFormFields = (body: any) => {
  console.log(body);
  console.log("FEATURES:", body.features);
  console.log("OVERLOOKING:", body.overlooking);

  return {
    ...body,

    // Numbers
    cityId:            body.cityId            ? Number(body.cityId)            : undefined,
    localityId:        body.localityId        ? Number(body.localityId)        : undefined,
    projectId:         body.projectId         ? Number(body.projectId)         : undefined,
    bhk:               body.bhk               ? Number(body.bhk)               : undefined,
    bathrooms:         body.bathrooms         ? Number(body.bathrooms)         : undefined,
    balconies:         body.balconies         ? Number(body.balconies)         : undefined,
    carpetArea:        body.carpetArea        ? Number(body.carpetArea)        : undefined,
    builtUpArea:       body.builtUpArea       ? Number(body.builtUpArea)       : undefined,
    superArea:         body.superArea         ? Number(body.superArea)         : undefined,
    totalFloors:       body.totalFloors       ? Number(body.totalFloors)       : undefined,
    floorNumber:       body.floorNumber       ? Number(body.floorNumber)       : undefined,
    pricePerSqFt:      body.pricePerSqFt      ? Number(body.pricePerSqFt)      : undefined,
    maintenanceCharge: body.maintenanceCharge ? Number(body.maintenanceCharge) : undefined,
    securityDeposit:   body.securityDeposit   ? Number(body.securityDeposit)   : undefined,
    latitude:          body.latitude          ? Number(body.latitude)          : undefined,
    longitude:         body.longitude         ? Number(body.longitude)         : undefined,

    // Booleans
    isNegotiable:
      body.isNegotiable === "true"
        ? true
        : body.isNegotiable === "false"
        ? false
        : undefined,

    // Arrays
    features:
      body.features
        ? JSON.parse(body.features)
        : [],

    overlooking:
      body.overlooking
        ? JSON.parse(body.overlooking)
        : [],
  };
};

// ============================================================
// POST /properties
// Content-Type: multipart/form-data
// Fields: all property fields as form fields
// Files:  images[] — up to 10 property photos
// ============================================================

export const createProperty = async (req: Request, res: Response) => {
  try {
    const parsed        = parseFormFields(req.body);
    const validatedData = createPropertySchema.parse(parsed);

    const ownerId = (req as any).user?.id;

    if (!ownerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — please log in",
      });
    }

    const files = (req.files as Express.Multer.File[]) ?? [];

    // Max 10 images per property
    if (files.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Maximum 10 images allowed per property",
      });
    }

    const property = await addProperty(validatedData, ownerId, files);

    return res.status(201).json({
      success: true,
      message: "Property listed successfully",
      data: safe(property),
    });
  } catch (error: any) {
    console.error("CREATE PROPERTY ERROR:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((i) => ({
          field:   i.path.join("."),
          message: i.message,
        })),
      });
    }

    if (error.message === "CITY_NOT_FOUND") {
      return res.status(400).json({ success: false, message: "Selected city does not exist" });
    }
    if (error.message === "LOCALITY_NOT_FOUND") {
      return res.status(400).json({ success: false, message: "Locality does not belong to the selected city" });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create property",
    });
  }
};

// ============================================================
// POST /properties/:id/images
// Add more images to an existing property after creation
// Content-Type: multipart/form-data
// Files: images[]
// ============================================================

export const uploadImages = async (req: Request, res: Response) => {
  try {
    const propertyId    = Number(req.params.id);
    const requesterId   = (req as any).user?.id;
    const requesterRole = (req as any).user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized — please log in" });
    }

    if (isNaN(propertyId) || propertyId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid property ID" });
    }

    const files = (req.files as Express.Multer.File[]) ?? [];

    if (files.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided" });
    }

    if (files.length > 10) {
      return res.status(400).json({ success: false, message: "Maximum 10 images per upload" });
    }

    const property = await addImagesToProperty(
      propertyId,
      requesterId,
      requesterRole,
      files
    );

    return res.json({
      success: true,
      message: `${files.length} image(s) uploaded successfully`,
      data: safe(property),
    });
  } catch (error: any) {
    console.error("UPLOAD IMAGES ERROR:", error);

    if (error.message === "PROPERTY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "You do not have permission" });
    }

    return res.status(500).json({ success: false, message: "Failed to upload images" });
  }
};

// ============================================================
// DELETE /properties/images/:imageId
// Remove a single image from a property
// ============================================================

export const removeImage = async (req: Request, res: Response) => {
  try {
    const imageId       = Number(req.params.imageId);
    const requesterId   = (req as any).user?.id;
    const requesterRole = (req as any).user?.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized — please log in" });
    }

    if (isNaN(imageId) || imageId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid image ID" });
    }

    await deletePropertyImage(imageId, requesterId, requesterRole);

    return res.json({ success: true, message: "Image deleted successfully" });
  } catch (error: any) {
    console.error("DELETE IMAGE ERROR:", error);

    if (error.message === "IMAGE_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Image not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "You do not have permission" });
    }

    return res.status(500).json({ success: false, message: "Failed to delete image" });
  }
};

// ============================================================
// PATCH /properties/:id
// ============================================================

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid property ID" });
    }

    const parsed        = parseFormFields(req.body);
    const validatedData = updatePropertySchema.parse(parsed);
    const requesterId   = (req as any).user?.id;
    const requesterRole = (req as any).user?.role;

    const property = await editProperty(id, validatedData, requesterId, requesterRole);

    return res.json({
      success: true,
      message: "Property updated successfully",
      data:    safe(property),
    });
  } catch (error: any) {
    console.error("UPDATE PROPERTY ERROR:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors:  error.issues.map((i) => ({
          field:   i.path.join("."),
          message: i.message,
        })),
      });
    }

    if (error.message === "PROPERTY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "You do not have permission to edit this property" });
    }

    return res.status(500).json({ success: false, message: "Failed to update property" });
  }
};

// ============================================================
// DELETE /properties/:id
// ============================================================

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, message: "Invalid property ID" });
    }

    const requesterId   = (req as any).user?.id;
    const requesterRole = (req as any).user?.role;

    await removeProperty(id, requesterId, requesterRole);

    return res.json({
      success: true,
      message: "Property removed successfully",
    });
  } catch (error: any) {
    console.error("DELETE PROPERTY ERROR:", error);

    if (error.message === "PROPERTY_NOT_FOUND") {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    if (error.message === "FORBIDDEN") {
      return res.status(403).json({ success: false, message: "You do not have permission to delete this property" });
    }

    return res.status(500).json({ success: false, message: "Failed to delete property" });
  }
};
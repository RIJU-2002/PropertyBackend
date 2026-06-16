import { Request, Response } from "express";
import { fetchProperties, createPropertyFromProject } from "../services/property.service";
import { createPropertySchema, updatePropertySchema, createPropertyFromProjectSchema } from "../validations/property.validation";
import { z } from "zod";

export const getProperties = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await fetchProperties(
      req.query
    );

    const safeData = JSON.parse(
      JSON.stringify(result, (_, value) =>
        typeof value === "bigint"
          ? value.toString()
          : value
      )
    );

    res.json({
      success: true,
      ...safeData,
    });
  } catch (error) {
    console.error(
      "PROPERTY FETCH ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch properties",
    });
  }
};



// export const getPropertyBySlug = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const property = await fetchPropertyBySlug(
//       req.params.slug as string
//     );

//     if (!property) {
//       return res.status(404).json({
//         success: false,
//         message: "Property not found",
//       });
//     }

//     const safeData = JSON.parse(
//       JSON.stringify(property, (_, value) =>
//         typeof value === "bigint"
//           ? value.toString()
//           : value
//       )
//     );

//     res.json({
//       success: true,
//       data: safeData,
//     });
//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch property",
//     });
//   }
// };



// export const createProperty = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const validatedData =
//       createPropertySchema.parse(req.body);

//     const property = await addProperty(
//       validatedData
//     );

//     const safeData = JSON.parse(
//       JSON.stringify(property, (_, value) =>
//         typeof value === "bigint"
//           ? value.toString()
//           : value
//       )
//     );

//     res.status(201).json({
//       success: true,
//       data: safeData,
//     });
//   } catch (error: any) {
//     console.error("CREATE PROPERTY ERROR:", error);

//    if (error instanceof z.ZodError) {
//     return res.status(400).json({
//       success: false,
//       errors: error.issues,
//     });
//   }

//     res.status(500).json({
//       success: false,
//       message: "Failed to create property",
//     });
//   }
// };


// export const updateProperty = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const validatedData =
//       updatePropertySchema.parse(req.body);

//     const property = await editProperty(
//       Number(req.params.id),
//       validatedData
//     );

//     const safeData = JSON.parse(
//       JSON.stringify(property, (_, value) =>
//         typeof value === "bigint"
//           ? value.toString()
//           : value
//       )
//     );

//     res.json({
//       success: true,
//       data: safeData,
//     });
//   } catch (error) {
//     console.error("UPDATE PROPERTY ERROR:", error);

//     if (error instanceof z.ZodError) {
//       return res.status(400).json({
//         success: false,
//         errors: error.issues,
//       });
//     }

//     res.status(500).json({
//       success: false,
//       message: "Failed to update property",
//     });
//   }
// };

// export const deleteProperty = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const property = await removeProperty(
//       Number(req.params.id)
//     );

//     const safeData = JSON.parse(
//       JSON.stringify(property, (_, value) =>
//         typeof value === "bigint"
//           ? value.toString()
//           : value
//       )
//     );

//     res.json({
//       success: true,
//       message: "Property deleted successfully",
//       data: safeData,
//     });
//   } catch (error) {
//     console.error("DELETE PROPERTY ERROR:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to delete property",
//     });
//   }
// };

// ============================================================
// POST /projects/:projectId/properties
// Create property for project (auto-fills location, builder)
// ============================================================

export const createPropertyForProject = async (
  req: Request,
  res: Response
) => {
  try {
    const projectId = Number(req.params.projectId);
    const parsed = {
      bhk: req.body.bhk ? Number(req.body.bhk) : undefined,
      propertyType: req.body.propertyType,
      superArea: req.body.superArea ? Number(req.body.superArea) : undefined,
      carpetArea: req.body.carpetArea ? Number(req.body.carpetArea) : undefined,
      balconies: req.body.balconies ? Number(req.body.balconies) : undefined,
      floorNumber: req.body.floorNumber ? Number(req.body.floorNumber) : undefined,
      facing: req.body.facing,
      pricePerSqFt: req.body.pricePerSqFt
        ? Number(req.body.pricePerSqFt)
        : undefined,
      ownerId: req.body.ownerId ? Number(req.body.ownerId) : undefined,
      features: req.body.features
        ? typeof req.body.features === "string"
          ? req.body.features.split(",").map((f: string) => f.trim())
          : req.body.features
        : [],
      title: req.body.title,
      description: req.body.description,
    };

    const validatedData = createPropertyFromProjectSchema.parse(parsed);
    const property = await createPropertyFromProject(projectId, validatedData);

    const safeData = JSON.parse(
      JSON.stringify(property, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    return res.status(201).json({
      success: true,
      message: "Property created successfully",
      data: safeData,
    });
  } catch (error: any) {
    console.error("CREATE PROPERTY FOR PROJECT ERROR:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }

    if (error.message === "PROJECT_NOT_FOUND")
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    if (error.message === "BUILDER_NOT_FOUND")
      return res
        .status(404)
        .json({ success: false, message: "Builder not found" });

    return res.status(500).json({
      success: false,
      message: "Failed to create property",
    });
  }
};
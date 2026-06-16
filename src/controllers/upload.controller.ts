import { Request, Response } from "express";

import cloudinary from "../config/cloudinary";

export const uploadImage = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    // Convert buffer to base64

    const fileBase64 =
      req.file.buffer.toString("base64");

    const dataURI = `data:${req.file.mimetype};base64,${fileBase64}`;

    // Upload to Cloudinary

    const result =
      await cloudinary.uploader.upload(
        dataURI,
        {
          folder: "property-app",
        }
      );

    return res.status(200).json({
      success: true,

      image: {
        url: result.secure_url,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Image upload failed",
    });
  }
};
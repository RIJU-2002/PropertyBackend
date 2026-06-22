import { Request, Response } from "express";
import { geocodeAddress } from "../services/geocode.service";

export const geocodeLocation = async (
  req: Request,
  res: Response
) => {
  try {
    const { address } = req.body;

    const result = await geocodeAddress({
      address,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("GEOCODE ERROR:", error);

    if (error.message === "ADDRESS_REQUIRED") {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    if (error.message === "LOCATION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to geocode address",
    });
  }
};
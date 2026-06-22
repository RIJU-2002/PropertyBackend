import { Request, Response } from "express";
import * as amenityService from "../services/amenity.service";

export const fetchAmenities = async (
  req: Request,
  res: Response
) => {
  try {
    const amenities =
      await amenityService.getAmenities();

    return res.status(200).json({
      success: true,
      data: amenities,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch amenities",
    });
  }
};
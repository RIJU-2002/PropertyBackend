import prisma from "../lib/prisma";
import { cacheRemember } from "../utils/cache";

export const getAmenities = async () => {
  return cacheRemember("amenities:all", 3600, () =>
    prisma.amenity.findMany({
      orderBy: {
        name: "asc",
      },
    })
  );
};
import prisma from "../lib/prisma";

export const getAmenities = async () => {
  return prisma.amenity.findMany({
    orderBy: {
      name: "asc",
    },
  });
};
import prisma from "../lib/prisma";

// ============================================================
// TYPES
// ============================================================

interface UpdateProfileInput {
  name?:      string;
  email?:     string;
  avatarUrl?: string;
}

// ============================================================
// GET USER PROFILE
// ============================================================

export const fetchUserProfile = async (userId: number) => {
  return prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:        true,
      phone:     true,
      name:      true,
      email:     true,
      role:      true,
      avatarUrl: true,
      createdAt: true,
      // counts
      _count: {
        select: {
          properties:      true,
          savedProperties: true,
          savedProjects:   true,
          leads:           true,
        },
      },
    },
  });
};

// ============================================================
// UPDATE USER PROFILE
// ============================================================

export const updateUserProfile = async (
  userId: number,
  data:   UpdateProfileInput
) => {
  // If email is being updated check it's not already taken
  if (data.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email: data.email,
        NOT:   { id: userId },   // exclude current user
      },
      select: { id: true },
    });

    if (existing) throw new Error("EMAIL_TAKEN");
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name      && { name:      data.name      }),
      ...(data.email     && { email:     data.email     }),
      ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
    },
    select: {
      id:        true,
      phone:     true,
      name:      true,
      email:     true,
      role:      true,
      avatarUrl: true,
      createdAt: true,
    },
  });
};

// ============================================================
// GET USER SAVED PROPERTIES
// ============================================================

export const fetchSavedProperties = async (userId: number) => {
  return prisma.savedProperty.findMany({
    where: { userId },
    include: {
      property: {
        select: {
          id:          true,
          title:       true,
          slug:        true,
          price:       true,
          bhk:         true,
          superArea:   true,
          listingType: true,
          isActive:    true,
          locality: { select: { name: true } },
          city:     { select: { name: true, slug: true } },
          images: {
            where:   { isCover: true },
            take:    1,
            select:  { url: true },
          },
        },
      },
    },
    orderBy: { savedAt: "desc" },
  });
};

// ============================================================
// SAVE / UNSAVE PROPERTY (toggle)
// ============================================================

export const toggleSaveProperty = async (
  userId:     number,
  propertyId: number
) => {
  const existing = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId, propertyId } },
  });

  if (existing) {
    // already saved → unsave
    await prisma.savedProperty.delete({
      where: { userId_propertyId: { userId, propertyId } },
    });
    return { saved: false };
  } else {
    // not saved → save
    await prisma.savedProperty.create({
      data: { userId, propertyId },
    });
    return { saved: true };
  }
};

// ============================================================
// GET USER SAVED PROJECTS
// ============================================================

export const fetchSavedProjects = async (userId: number) => {
  return prisma.savedProject.findMany({
    where: { userId },
    include: {
      project: {
        select: {
          id:              true,
          name:            true,
          slug:            true,
          minPrice:        true,
          maxPrice:        true,
          possessionStatus: true,
          locality: { select: { name: true } },
          city:     { select: { name: true, slug: true } },
          images: {
            where:   { isCover: true },
            take:    1,
            select:  { url: true },
          },
        },
      },
    },
    orderBy: { savedAt: "desc" },
  });
};

// ============================================================
// SAVE / UNSAVE PROJECT (toggle)
// ============================================================

export const toggleSaveProject = async (
  userId:    number,
  projectId: number
) => {
  const existing = await prisma.savedProject.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });

  if (existing) {
    await prisma.savedProject.delete({
      where: { userId_projectId: { userId, projectId } },
    });
    return { saved: false };
  } else {
    await prisma.savedProject.create({
      data: { userId, projectId },
    });
    return { saved: true };
  }
};
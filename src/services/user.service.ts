import prisma from "../lib/prisma";
import { UserRole } from "@prisma/client";
import type { CreateUserInput } from "../validations/user.validation";

// ============================================================
// TYPES
// ============================================================

interface UpdateProfileInput {
  name?:      string;
  email?:     string;
  avatarUrl?: string;
}

const userSelect = {
  id: true,
  phone: true,
  name: true,
  email: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
} as const;

const agentInclude = {
  user: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
    },
  },
} as const;

// ============================================================
// ADMIN CREATE USER
// BUYER / ADMIN → User row only
// AGENT → User row + Agent profile (creates or promotes by phone)
// ============================================================

export const createUser = async (data: CreateUserInput) => {
  const role = data.role ?? "BUYER";

  const existing = await prisma.user.findUnique({
    where: { phone: data.phone },
    include: { agent: { select: { id: true } } },
  });

  if (data.email) {
    const emailTaken = await prisma.user.findFirst({
      where: {
        email: data.email,
        ...(existing ? { NOT: { id: existing.id } } : {}),
      },
      select: { id: true },
    });

    if (emailTaken) throw new Error("EMAIL_TAKEN");
  }

  if (role !== "AGENT") {
    if (existing) throw new Error("PHONE_TAKEN");

    const user = await prisma.user.create({
      data: {
        phone: data.phone,
        name: data.name,
        email: data.email,
        role,
      },
      select: userSelect,
    });

    return { user, agent: null };
  }

  if (existing?.role === "ADMIN") {
    throw new Error("CANNOT_CONVERT_ADMIN");
  }

  if (existing?.agent) {
    throw new Error("AGENT_ALREADY_EXISTS");
  }

  if (data.reraNumber) {
    const existingRera = await prisma.agent.findUnique({
      where: { reraNumber: data.reraNumber },
      select: { id: true },
    });

    if (existingRera) throw new Error("RERA_ALREADY_EXISTS");
  }

  return prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            role: UserRole.AGENT,
            ...(data.name ? { name: data.name } : {}),
            ...(data.email ? { email: data.email } : {}),
          },
          select: userSelect,
        })
      : await tx.user.create({
          data: {
            phone: data.phone,
            name: data.name,
            email: data.email,
            role: UserRole.AGENT,
          },
          select: userSelect,
        });

    const agent = await tx.agent.create({
      data: {
        userId: user.id,
        reraNumber: data.reraNumber,
        agencyName: data.agencyName,
        licenseUrl: data.licenseUrl,
        isVerified: false,
        isActive: true,
      },
      include: agentInclude,
    });

    return { user, agent };
  });
};

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
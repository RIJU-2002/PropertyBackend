// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// export default prisma;

import { PrismaClient } from "@prisma/client";

// Prevent multiple instances in development due to hot reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
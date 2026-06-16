import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const getStates = async (req: Request, res: Response) => {
  const states = await prisma.state.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  });

  return res.json({
    success: true,
    data: states,
  });
};
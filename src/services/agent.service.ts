import prisma from "../lib/prisma";

interface CreateAgentInput {
  userId?: number;
  phone?: string;
  reraNumber?: string;
  agencyName?: string;
  licenseUrl?: string;
}

export const createAgent = async (
  data: CreateAgentInput
) => {
  const user = data.userId
    ? await prisma.user.findUnique({
        where: { id: data.userId },
        select: { id: true, role: true },
      })
    : await prisma.user.findUnique({
        where: { phone: data.phone! },
        select: { id: true, role: true },
      });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.role === "ADMIN") {
    throw new Error("CANNOT_CONVERT_ADMIN");
  }

  const existingAgent = await prisma.agent.findUnique({
    where: { userId: user.id },
  });

  if (existingAgent) {
    throw new Error("AGENT_ALREADY_EXISTS");
  }

  if (data.reraNumber) {
    const existingRera = await prisma.agent.findUnique({
      where: { reraNumber: data.reraNumber },
    });

    if (existingRera) {
      throw new Error("RERA_ALREADY_EXISTS");
    }
  }

  const [, agent] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { role: "AGENT" },
    }),
    prisma.agent.create({
      data: {
        userId: user.id,
        reraNumber: data.reraNumber,
        agencyName: data.agencyName,
        licenseUrl: data.licenseUrl,
        isVerified: false,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  return agent;
};



export const fetchAgents = async (
  page = 1,
  limit = 20,
  isVerified?: boolean
) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(isVerified !== undefined
      ? { isVerified }
      : {}),
  };

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      skip,
      take: limit,

      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },

        _count: {
          select: {
            leads: true,
            properties: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.agent.count({
      where,
    }),
  ]);

  return {
    agents,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

export const fetchAgentById = async (
  agentId: number
) => {
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },

      _count: {
        select: {
          leads: true,
          properties: true,
        },
      },
    },
  });

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  return agent;
};


export const verifyAgent = async (
  agentId: number,
  verified: boolean
) => {
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  return prisma.agent.update({
    where: {
      id: agentId,
    },

    data: {
      isVerified: verified,
    },
  });
};

interface UpdateAgentInput {
  reraNumber?: string;
  agencyName?: string;
  licenseUrl?: string;
}

export const updateAgent = async (
  agentId: number,
  data: UpdateAgentInput
) => {
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  if (
    data.reraNumber &&
    data.reraNumber !== agent.reraNumber
  ) {
    const existingRera =
      await prisma.agent.findUnique({
        where: {
          reraNumber: data.reraNumber,
        },
      });

    if (existingRera) {
      throw new Error("RERA_ALREADY_EXISTS");
    }
  }

  return prisma.agent.update({
    where: {
      id: agentId,
    },
    data: {
      reraNumber: data.reraNumber,
      agencyName: data.agencyName,
      licenseUrl: data.licenseUrl,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },
  });
};

export const updateAgentActiveStatus = async (
  agentId: number,
  isActive: boolean
) => {
  const agent = await prisma.agent.findUnique({
    where: {
      id: agentId,
    },
  });

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  return prisma.agent.update({
    where: {
      id: agentId,
    },
    data: {
      isActive,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
    },
  });
};

// ============================================================
// GET MY AGENT PROFILE
// ============================================================

export const fetchMyAgentProfile = async (
  userId: number
) => {
  const agent = await prisma.agent.findUnique({
    where: {
      userId,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },

      _count: {
        select: {
          leads: true,
          properties: true,
        },
      },
    },
  });

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  return agent;
};


// ============================================================
// UPDATE MY AGENT PROFILE
// ============================================================

interface UpdateMyAgentProfileInput {
  reraNumber?: string;
  agencyName?: string;
  licenseUrl?: string;
}

export const updateMyAgentProfile = async (
  userId: number,
  data: UpdateMyAgentProfileInput
) => {
  const agent = await prisma.agent.findUnique({
    where: {
      userId,
    },
  });

  if (!agent) {
    throw new Error("AGENT_NOT_FOUND");
  }

  // Check RERA uniqueness if changed
  if (
    data.reraNumber &&
    data.reraNumber !== agent.reraNumber
  ) {
    const existingRera = await prisma.agent.findUnique({
      where: {
        reraNumber: data.reraNumber,
      },
    });

    if (existingRera) {
      throw new Error("RERA_ALREADY_EXISTS");
    }
  }

  return prisma.agent.update({
    where: {
      userId,
    },

    data: {
      reraNumber: data.reraNumber,
      agencyName: data.agencyName,
      licenseUrl: data.licenseUrl,
    },

    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },

      _count: {
        select: {
          leads: true,
          properties: true,
        },
      },
    },
  });
};


export const fetchAgentLeads = async (
  agentId: number,
  status?: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const where: any = { agentId };

  if (status) {
    where.status = status;
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        property: {
          select: {
            title: true,
            slug: true,
            price: true,
          },
        },

        project: {
          select: {
            name: true,
            slug: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      skip,
      take: limit,
    }),

    prisma.lead.count({
      where,
    }),
  ]);

  return {
    leads,

    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};
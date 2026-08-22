import prisma from "../lib/prisma";

// ============================================================
// TYPES
// ============================================================

interface SubmitLeadInput {
  propertyId?: number;
  projectId?:  number;
  guestName?:  string;
  guestPhone?: string;
  guestEmail?: string;
  message?:       string;
  budget?:        string;
  bhkPreference?: number[];
  source?:        string;
  agentId?:       number;
}

const agentSelect = {
  id: true,
  agencyName: true,
  isVerified: true,
  isActive: true,
  user: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
} as const;

const leadInclude = {
  property: { select: { title: true, slug: true, price: true } },
  project:  { select: { name: true, slug: true } },
  agent:    { select: agentSelect },
  buyer: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
} as const;

const pickAvailableAgent = async (): Promise<number | undefined> => {
  const agent = await prisma.agent.findFirst({
    where: { isActive: true },
    orderBy: [
      { isVerified: "desc" },
      { leads: { _count: "asc" } },
    ],
    select: { id: true },
  });

  return agent?.id;
};

const resolveAgentId = async (
  requestedAgentId?: number,
  propertyAgentId?: number | null
): Promise<number | undefined> => {
  if (requestedAgentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: requestedAgentId },
      select: { id: true, isActive: true },
    });

    if (!agent) throw new Error("AGENT_NOT_FOUND");
    if (!agent.isActive) throw new Error("AGENT_INACTIVE");

    return agent.id;
  }

  if (propertyAgentId) return propertyAgentId;

  return pickAvailableAgent();
};

// ============================================================
// SUBMIT LEAD (enquiry form)
// Works for both logged-in users and guests
// ============================================================

export const submitLead = async (
  data:    SubmitLeadInput,
  buyerId: number | null
) => {
  if (!buyerId && !data.guestPhone) {
    throw new Error("GUEST_PHONE_REQUIRED");
  }

  if (data.propertyId || data.projectId) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const duplicate = await prisma.lead.findFirst({
      where: {
        ...(buyerId
          ? { buyerId }
          : { guestPhone: data.guestPhone }),
        ...(data.propertyId ? { propertyId: data.propertyId } : {}),
        ...(data.projectId  ? { projectId:  data.projectId  } : {}),
        createdAt: { gt: oneDayAgo },
      },
    });

    if (duplicate) throw new Error("DUPLICATE_LEAD");
  }

  let propertyAgentId: number | null | undefined;

  if (data.propertyId) {
    const property = await prisma.property.findUnique({
      where:  { id: data.propertyId },
      select: { agentId: true, isActive: true },
    });

    if (!property)          throw new Error("PROPERTY_NOT_FOUND");
    if (!property.isActive) throw new Error("PROPERTY_NOT_ACTIVE");

    propertyAgentId = property.agentId;
  }

  if (data.projectId) {
    const project = await prisma.project.findUnique({
      where:  { id: data.projectId },
      select: { id: true },
    });

    if (!project) throw new Error("PROJECT_NOT_FOUND");
  }

  const agentId = await resolveAgentId(data.agentId, propertyAgentId);

  return prisma.lead.create({
    data: {
      buyerId:       buyerId ?? undefined,
      guestName:     data.guestName,
      guestPhone:    data.guestPhone,
      guestEmail:    data.guestEmail,
      propertyId:    data.propertyId,
      projectId:     data.projectId,
      agentId,
      message:       data.message,
      budget:        data.budget ? BigInt(data.budget) : undefined,
      bhkPreference: data.bhkPreference ?? [],
      status:        "NEW",
      source:        data.source ?? "listing_page",
    },
    include: leadInclude,
  });
};

// ============================================================
// GET MY LEADS — buyer view
// Shows all enquiries the logged-in user has submitted
// ============================================================

export const fetchMyLeads = async (buyerId: number) => {
  const leads = await prisma.lead.findMany({
    where:   { buyerId },
    include: {
      property: {
        select: {
          title:    true,
          slug:     true,
          price:    true,
          bhk:      true,
          locality: { select: { name: true } },
          images: {
            where:   { isCover: true },
            take:    1,
            select:  { url: true },
          },
        },
      },
      project: {
        select: {
          name:     true,
          slug:     true,
          minPrice: true,
          locality: { select: { name: true } },
          images: {
            where:   { isCover: true },
            take:    1,
            select:  { url: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return leads;
};

// ============================================================
// GET AGENT LEADS — agent/builder view
// Shows all leads assigned to this agent
// ============================================================

export const fetchAgentLeads = async (
  agentId:  number,
  status?:  string,
  page:     number = 1,
  limit:    number = 20
) => {
  const skip = (page - 1) * limit;

  const where: any = { agentId };
  if (status) where.status = status;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        property: {
          select: { title: true, slug: true, price: true },
        },
        project: {
          select: { name: true, slug: true },
        },
        agent: { select: agentSelect },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext:    page < Math.ceil(total / limit),
      hasPrev:    page > 1,
    },
  };
};

// ============================================================
// UPDATE LEAD STATUS — agent only
// Move a lead through the pipeline
// ============================================================

export const updateLeadStatus = async (
  leadId: number,
  agentUserId: number,
  requesterRole: string,
  status: string,
  notes?: string,
  followUpAt?: string
) => {

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { agentId: true },
  });

  if (!lead) {
    throw new Error("LEAD_NOT_FOUND");
  }

  // Admin can update any lead
  if (requesterRole !== "ADMIN") {

    const agent = await prisma.agent.findUnique({
      where: { userId: agentUserId },
      select: { id: true },
    });

    if (!agent) {
      throw new Error("FORBIDDEN");
    }

    // Compare Agent.id with Lead.agentId
    if (lead.agentId !== agent.id) {
      throw new Error("FORBIDDEN");
    }
  }

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      status: status as any,
      notes,
      followUpAt: followUpAt
        ? new Date(followUpAt)
        : undefined,
    },
    include: leadInclude,
  });
};

export const fetchAdminLeads = async (
  page = 1,
  limit = 20,
  status?: string,
  agentId?: number,
  unassigned?: boolean
) => {
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (unassigned) where.agentId = null;
  else if (agentId) where.agentId = agentId;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: leadInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

export const assignLeadToAgent = async (
  leadId: number,
  agentId: number
) => {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!lead) throw new Error("LEAD_NOT_FOUND");

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, isActive: true },
  });

  if (!agent) throw new Error("AGENT_NOT_FOUND");
  if (!agent.isActive) throw new Error("AGENT_INACTIVE");

  return prisma.lead.update({
    where: { id: leadId },
    data: { agentId: agent.id },
    include: leadInclude,
  });
};

export const fetchLeadSummary = async () => {
  const [total, byStatus, byAgent] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.lead.groupBy({
      by: ["agentId"],
      _count: { _all: true },
    }),
  ]);

  const agentIds = byAgent
    .map((row) => row.agentId)
    .filter((id): id is number => id !== null);

  const agents = agentIds.length
    ? await prisma.agent.findMany({
        where: { id: { in: agentIds } },
        select: agentSelect,
      })
    : [];

  const agentMap = new Map(agents.map((agent) => [agent.id, agent]));

  return {
    total,
    unassigned: byAgent.find((row) => row.agentId === null)?._count._all ?? 0,
    byStatus: byStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
    byAgent: byAgent.map((row) => ({
      agentId: row.agentId,
      count: row._count._all,
      agent: row.agentId ? agentMap.get(row.agentId) ?? null : null,
    })),
  };
};
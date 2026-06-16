import prisma from "../lib/prisma";

// ============================================================
// TYPES
// ============================================================

interface SubmitLeadInput {
  // What they're enquiring about — one of these must be present
  propertyId?: number;
  projectId?:  number;

  // Guest fields — used when user is NOT logged in
  guestName?:  string;
  guestPhone?: string;
  guestEmail?: string;

  // Lead details
  message?:       string;
  budget?:        string;  // BigInt as string
  bhkPreference?: number[];
  source?:        string;
}

// ============================================================
// SUBMIT LEAD (enquiry form)
// Works for both logged-in users and guests
// ============================================================

export const submitLead = async (
  data:    SubmitLeadInput,
  buyerId: number | null   // null if guest
) => {
  // Must enquire about something
  if (!data.propertyId && !data.projectId) {
    throw new Error("MISSING_TARGET");
  }

  // Guest must provide phone
  if (!buyerId && !data.guestPhone) {
    throw new Error("GUEST_PHONE_REQUIRED");
  }

  // Check for duplicate lead — same user/phone + same property in last 24hrs
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

  // Find the agent assigned to the property (if any)
  let agentId: number | undefined;

  if (data.propertyId) {
    const property = await prisma.property.findUnique({
      where:  { id: data.propertyId },
      select: { agentId: true, isActive: true },
    });

    if (!property)          throw new Error("PROPERTY_NOT_FOUND");
    if (!property.isActive) throw new Error("PROPERTY_NOT_ACTIVE");

    agentId = property.agentId ?? undefined;
  }

  if (data.projectId) {
    const project = await prisma.project.findUnique({
      where:  { id: data.projectId },
      select: { id: true },
    });

    if (!project) throw new Error("PROJECT_NOT_FOUND");
  }

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
    include: {
      property: { select: { title: true, slug: true } },
      project:  { select: { name:  true, slug: true } },
    },
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
  });
};
import prisma from "../lib/prisma";
import { LeadStatus } from "@prisma/client";
class AnalyticsService {
  // ==========================================================
  // Dashboard Overview
  // ==========================================================
  async getOverview() {
    function formatCurrency(value?: bigint | null) {
      return `₹${Number(value ?? 0).toLocaleString("en-IN")}`;
    }
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const [
      totalProjects,
      activeProjects,
      featuredProjects,
      trendingProjects,
      newLaunchProjects,

      totalProperties,
      activeProperties,
      featuredProperties,

      totalBuilders,
      verifiedBuilders,

      totalCities,
      totalLocalities,

      totalUsers,
      totalLeads,
      totalArticles,
      //new
      inventoryValue,
      avgPropertyPrice,
      avgProjectPrice,
      avgPricePerSqFt,
      monthlyProjects,
      monthlyProperties,
      monthlyLeads,
      convertedLeads,
      activeBuilders
    ] = await Promise.all([
      prisma.project.count(),

      prisma.project.count({
        where: {
          isActive: true,
        },
      }),

      prisma.project.count({
        where: {
          isFeatured: true,
        },
      }),

      prisma.project.count({
        where: {
          isTrending: true,
        },
      }),

      prisma.project.count({
        where: {
          isNewLaunch: true,
        },
      }),

      prisma.property.count(),

      prisma.property.count({
        where: {
          isActive: true,
        },
      }),

      prisma.property.count({
        where: {
          isFeatured: true,
        },
      }),

      prisma.builder.count(),

      prisma.builder.count({
        where: {
          isVerified: true,
        },
      }),

      prisma.city.count(),

      prisma.locality.count(),

      prisma.user.count(),

      prisma.lead.count(),

      prisma.article.count(),
        prisma.property.aggregate({
        where: {
          isActive: true,
          price: { not: null },
        },
        _sum: {
          price: true,
        },
      }),

      prisma.property.aggregate({
        where: {
          isActive: true,
        },
        _avg: {
          price: true,
        },
      }),

      prisma.project.aggregate({
        where: {
          isActive: true,
        },
        _avg: {
          minPrice: true,
        },
      }),

      prisma.property.aggregate({
        where: {
          isActive: true,
        },
        _avg: {
          pricePerSqFt: true,
        },
      }),

      prisma.project.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      prisma.property.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      prisma.lead.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      }),

      prisma.lead.count({
      where: {
        status: LeadStatus.CONVERTED,
        createdAt: {
          gte: startOfMonth,
        },
      },
    }),

    prisma.builder.count({
      where: {
        isVerified: true,
      },
    }),
    ]);

    return {
      projects: {
        total: totalProjects,
        active: activeProjects,
        featured: featuredProjects,
        trending: trendingProjects,
        newLaunch: newLaunchProjects,
      },

      properties: {
        total: totalProperties,
        active: activeProperties,
        featured: featuredProperties,
      },

      builders: {
        total: totalBuilders,
        verified: verifiedBuilders,
      },

      locations: {
        cities: totalCities,
        localities: totalLocalities,
      },

      users: totalUsers,

      leads: totalLeads,

      articles: totalArticles,
      totalInventoryValue: formatCurrency(inventoryValue._sum.price),

      avgPropertyPrice: Number(avgPropertyPrice._avg.price ?? 0),

      avgProjectPrice: Number(avgProjectPrice._avg.minPrice ?? 0),

      avgPricePerSqFt: Number(avgPricePerSqFt._avg.pricePerSqFt ?? 0),

      monthlyProjects,

      monthlyProperties,

      monthlyLeads,

      activeBuilders,

      conversionRate:
        totalLeads === 0
          ? 0
          : Number(((convertedLeads / totalLeads) * 100).toFixed(2)),
    };
  }

  // ==========================================================
  // Project Growth
  // ==========================================================
  async getProjectGrowth() {
    const data = await prisma.$queryRaw<
      {
        month: string;
        count: bigint;
      }[]
    >`
      SELECT
        TO_CHAR(DATE_TRUNC('month',"createdAt"),'Mon YYYY') AS month,
        COUNT(*) as count
      FROM "Project"
      GROUP BY DATE_TRUNC('month',"createdAt")
      ORDER BY DATE_TRUNC('month',"createdAt")
    `;

    return data.map((item) => ({
      month: item.month,
      count: Number(item.count),
    }));
  }

  // ==========================================================
  // Projects By City
  // ==========================================================
  async getProjectsByCity() {
    const cities = await prisma.city.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: {
        projects: {
          _count: "desc",
        },
      },
    });

    return cities.map((city) => ({
      city: city.name,
      projects: city._count.projects,
    }));
  }
  // ==========================================================
  // Property Type Distribution
  // ==========================================================
  async getPropertyTypeDistribution() {
    const data = await prisma.property.groupBy({
      by: ["propertyType"],

      _count: {
        propertyType: true,
      },

      orderBy: {
        _count: {
          propertyType: "desc",
        },
      },
    });

    return data.map((item) => ({
      propertyType: item.propertyType,
      count: item._count.propertyType,
    }));
  }

  // ==========================================================
  // Possession Status Distribution
  // ==========================================================
  async getPossessionDistribution() {
    const data = await prisma.project.groupBy({
      by: ["possessionStatus"],

      _count: {
        possessionStatus: true,
      },
    });

    return data.map((item) => ({
      status: item.possessionStatus,
      count: item._count.possessionStatus,
    }));
  }

  // ==========================================================
  // Builder Ranking
  // ==========================================================
  async getBuilderRanking() {
    const builders = await prisma.builder.findMany({
      select: {
        id: true,
        name: true,
        isVerified: true,

        _count: {
          select: {
            projects: true,
            properties: true,
          },
        },
      },

      orderBy: {
        projects: {
          _count: "desc",
        },
      },

      take: 10,
    });

    return builders.map((builder, index) => ({
      rank: index + 1,

      builderId: builder.id,

      builder: builder.name,

      verified: builder.isVerified,

      projects: builder._count.projects,

      properties: builder._count.properties,
    }));
  }


async getPropertyGrowth() {
  const data = await prisma.$queryRaw<
    {
      month: string;
      count: bigint;
    }[]
  >`
    SELECT
      TO_CHAR(DATE_TRUNC('month',"createdAt"),'Mon YYYY') AS month,
      COUNT(*) as count
    FROM "Property"
    GROUP BY DATE_TRUNC('month',"createdAt")
    ORDER BY DATE_TRUNC('month',"createdAt")
  `;

  return data.map((item) => ({
    month: item.month,
    count: Number(item.count),
  }));
}


async getLeadGrowth() {
  const data = await prisma.$queryRaw<
    {
      month: string;
      count: bigint;
    }[]
  >`
    SELECT
      TO_CHAR(DATE_TRUNC('month',"createdAt"),'Mon YYYY') AS month,
      COUNT(*) as count
    FROM "Lead"
    GROUP BY DATE_TRUNC('month',"createdAt")
    ORDER BY DATE_TRUNC('month',"createdAt")
  `;

  return data.map((item) => ({
    month: item.month,
    count: Number(item.count),
  }));
}



async getCityRanking() {
  const cities = await prisma.city.findMany({
    select: {
      id: true,
      name: true,

      _count: {
        select: {
          projects: true,
          properties: true,
        },
      },
    },

    orderBy: {
      properties: {
        _count: "desc",
      },
    },

    take: 10,
  });

  return cities.map((city, index) => ({
    rank: index + 1,
    cityId: city.id,
    city: city.name,
    projects: city._count.projects,
    properties: city._count.properties,
  }));
}


async getLocalityRanking() {
  const localities = await prisma.locality.findMany({
    select: {
      id: true,
      name: true,

      city: {
        select: {
          name: true,
        },
      },

      _count: {
        select: {
          projects: true,
          properties: true,
        },
      },
    },

    orderBy: {
      properties: {
        _count: "desc",
      },
    },

    take: 10,
  });

  return localities.map((locality, index) => ({
    rank: index + 1,
    localityId: locality.id,
    locality: locality.name,
    city: locality.city.name,
    projects: locality._count.projects,
    properties: locality._count.properties,
  }));
}


async getPricingSummary() {
  const aggregate = await prisma.property.aggregate({
    _avg: {
      price: true,
    },

    _min: {
      price: true,
    },

    _max: {
      price: true,
    },
  });

  return {
    average: Number(aggregate._avg.price ?? 0),
    minimum: Number(aggregate._min.price ?? 0),
    maximum: Number(aggregate._max.price ?? 0),
  };
}


async getPriceRanges() {
  const data = await prisma.$queryRaw<
    {
      range: string;
      count: bigint;
    }[]
  >`
    SELECT
      CASE
        WHEN price < 2500000 THEN 'Below 25L'
        WHEN price < 5000000 THEN '25L - 50L'
        WHEN price < 10000000 THEN '50L - 1Cr'
        WHEN price < 20000000 THEN '1Cr - 2Cr'
        ELSE 'Above 2Cr'
      END AS range,

      COUNT(*) as count

    FROM "Property"

    WHERE price IS NOT NULL

    GROUP BY range

    ORDER BY MIN(price)
  `;

  return data.map((item) => ({
    range: item.range,
    count: Number(item.count),
  }));
}


async getLocalityDistribution() {
  const localities = await prisma.locality.findMany({
    select: {
      id: true,
      name: true,

      city: {
        select: {
          name: true,
        },
      },

      _count: {
        select: {
          projects: true,
          properties: true,
        },
      },
    },

    orderBy: {
      projects: {
        _count: "desc",
      },
    },
  });

  return localities.map((locality) => ({
    localityId: locality.id,

    locality: locality.name,

    city: locality.city.name,

    projects: locality._count.projects,

    properties: locality._count.properties,

    total:
      locality._count.projects +
      locality._count.properties,
  }));
}

  // ==========================================================
// Dashboard Analytics
// Combines all analytics into one response
// ==========================================================
async getDashboardAnalytics() {
 const [
    overview,
    growthProjects,
    growthProperties,
    growthLeads,

    distCities,
    distLocalities,
    distPropertyTypes,
    distPossession,

    rankBuilders,
    rankCities,
    rankLocalities,

    pricingSummary,
    pricingRanges,
] = await Promise.all([
    this.getOverview(),

    this.getProjectGrowth(),
    this.getPropertyGrowth(),
    this.getLeadGrowth(),

    this.getProjectsByCity(),
    this.getLocalityDistribution(),
    this.getPropertyTypeDistribution(),
    this.getPossessionDistribution(),

    this.getBuilderRanking(),
    this.getCityRanking(),
    this.getLocalityRanking(),

    this.getPricingSummary(),
    this.getPriceRanges(),
]);

  return {
    overview,

    growth: {
      projects: growthProjects,
      properties: growthProperties,
      leads: growthLeads,
    },

    distribution: {
      cities: distCities,
      localities: distLocalities,
      propertyTypes: distPropertyTypes,
      possession: distPossession,
    },

    rankings: {
      builders: rankBuilders,
      cities: rankCities,
      localities: rankLocalities,
    },

    pricing: {
      summary: pricingSummary,
      ranges: pricingRanges,
    },
  };
}
}
export default new AnalyticsService();
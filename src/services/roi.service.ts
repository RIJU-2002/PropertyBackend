interface ROIInput {
  expectedRentMonthly?: number;
  appreciationRate?: number;
  rentalDemand?: "HIGH" | "MEDIUM" | "LOW";
  nearbyInfrastructure?: string;
}

interface ROICalculated {
  rentalYield: number;        // e.g., 8.5
  annualRent: number;       // rent × 12
  paybackYears: number;     // price / annualRent
  investmentScore: number;    // 0-100
  isInvestmentHotspot: boolean;
}

interface ProjectWithROI {
  id: number;
  name: string;
  slug: string;
  minPrice: bigint | null;
  maxPrice: bigint | null;
  // ... other project fields ...
  roi: ROICalculated | null;
}


// ── Constants ──
const HOTSPOT_MIN_YIELD = 6.0;      // 6%+ yield = hotspot
const HOTSPOT_MIN_SCORE = 75;       // 75+ score = hotspot

/**
 * Calculate all ROI metrics from raw inputs + project price
 */
export const calculateROI = (
  inputs: ROIInput,
  minPrice: number | bigint | null
): ROICalculated | null => {
  if (!inputs.expectedRentMonthly || !minPrice) return null;

  const price = Number(minPrice);
  const annualRent = inputs.expectedRentMonthly * 12;
  const rentalYield = (annualRent / price) * 100;
  const paybackYears = price / annualRent;

  // Investment Score (0-100)
  // 40% yield, 30% appreciation, 30% demand
  const yieldScore = Math.min((rentalYield / 10) * 40, 40);
  const appreciationScore = Math.min(((inputs.appreciationRate || 3) / 10) * 30, 30);
  const demandScore = inputs.rentalDemand === "HIGH" ? 30 : inputs.rentalDemand === "MEDIUM" ? 20 : 10;
  
  const investmentScore = Math.round(yieldScore + appreciationScore + demandScore);

  return {
    rentalYield: parseFloat(rentalYield.toFixed(1)),
    annualRent,
    paybackYears: parseFloat(paybackYears.toFixed(1)),
    investmentScore: Math.min(investmentScore, 100),
    isInvestmentHotspot: rentalYield >= HOTSPOT_MIN_YIELD || investmentScore >= HOTSPOT_MIN_SCORE,
  };
};

/**
 * Auto-generate tagline for display
 */
export const generateInvestmentTagline = (
  roi: ROICalculated,
  inputs: ROIInput
): string => {
  const parts: string[] = [];
  
  if (roi.rentalYield > 0) {
    parts.push(`${roi.rentalYield}% Rental Yield`);
  }
  
  if (inputs.appreciationRate && inputs.appreciationRate > 5) {
    parts.push(`${inputs.appreciationRate}% Appreciation`);
  }
  
  if (inputs.rentalDemand === "HIGH") {
    parts.push("High Demand");
  }
  
  return parts.join(" | ");
};
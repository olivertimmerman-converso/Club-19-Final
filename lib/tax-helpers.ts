/**
 * Tax-aware deal structure suggestions
 * Helps shoppers identify more tax-efficient routing without changing client price
 */

export type DealStructureSuggestion = {
  hasBetterAlternative: boolean;
  alternativeDescription?: string;
  currentDutiesGBP: number;
  alternativeDutiesGBP?: number;
  marginDeltaGBP?: number;
  isDutiesUnusuallyHigh?: boolean;
};

type DealStructureInput = {
  supplierCountry: string;
  deliveryCountry: string;
  itemLocation: "uk" | "outside" | null;
  clientLocation: "uk" | "outside" | null;
  supplierShipsDirect: boolean;
  landedDelivery: boolean;
  estimatedImportExportGBP: number | null;
  grossMarginGBP: number;
};

/**
 * Simple duty estimation logic
 * - If supplier and delivery are both non-UK and item stays outside UK → 0 duties
 * - If item comes to UK or client is in UK → duties apply (use existing estimate)
 */
function estimateDuties(input: DealStructureInput): number {
  const { supplierCountry, deliveryCountry, itemLocation, clientLocation } = input;

  // If both supplier and delivery are non-UK, and item is outside UK
  if (
    supplierCountry !== "United Kingdom" &&
    deliveryCountry !== "United Kingdom" &&
    itemLocation === "outside" &&
    clientLocation === "outside"
  ) {
    return 0;
  }

  // Otherwise use existing estimate or default
  return input.estimatedImportExportGBP ?? 0;
}

/**
 * Compute alternative, lower-tax structure suggestions
 */
export function computeDealStructureSuggestion(
  input: DealStructureInput,
): DealStructureSuggestion {
  const currentDutiesGBP = estimateDuties(input);

  // Case 1: Supplier and delivery are in the same non-UK country
  if (
    input.supplierCountry === input.deliveryCountry &&
    input.supplierCountry !== "United Kingdom" &&
    input.deliveryCountry !== "United Kingdom"
  ) {
    const alternativeDutiesGBP = 0;
    const marginDeltaGBP = currentDutiesGBP - alternativeDutiesGBP;

    // Only suggest if there's meaningful savings (>= £100)
    if (marginDeltaGBP >= 100) {
      return {
        hasBetterAlternative: true,
        alternativeDescription: `Supplier → direct to client in ${input.deliveryCountry}, non-landed`,
        currentDutiesGBP,
        alternativeDutiesGBP,
        marginDeltaGBP,
        isDutiesUnusuallyHigh: currentDutiesGBP > input.grossMarginGBP * 0.25,
      };
    }
  }

  // Case 2: Both supplier and delivery are non-UK, but item is routing through UK
  if (
    input.supplierCountry !== "United Kingdom" &&
    input.deliveryCountry !== "United Kingdom" &&
    input.itemLocation === "uk"
  ) {
    const alternativeDutiesGBP = 0;
    const marginDeltaGBP = currentDutiesGBP - alternativeDutiesGBP;

    if (marginDeltaGBP >= 100) {
      return {
        hasBetterAlternative: true,
        alternativeDescription: `Supplier → direct to client (${input.deliveryCountry}), outside UK`,
        currentDutiesGBP,
        alternativeDutiesGBP,
        marginDeltaGBP,
        isDutiesUnusuallyHigh: currentDutiesGBP > input.grossMarginGBP * 0.25,
      };
    }
  }

  // Case 3: Item is outside UK, delivery is non-UK, but shipping via Club 19
  if (
    input.itemLocation === "outside" &&
    input.clientLocation === "outside" &&
    !input.supplierShipsDirect &&
    currentDutiesGBP > 0
  ) {
    const alternativeDutiesGBP = 0;
    const marginDeltaGBP = currentDutiesGBP - alternativeDutiesGBP;

    if (marginDeltaGBP >= 100) {
      return {
        hasBetterAlternative: true,
        alternativeDescription: `Supplier ships direct to client, non-landed`,
        currentDutiesGBP,
        alternativeDutiesGBP,
        marginDeltaGBP,
        isDutiesUnusuallyHigh: currentDutiesGBP > input.grossMarginGBP * 0.25,
      };
    }
  }

  // No better alternative found
  return {
    hasBetterAlternative: false,
    currentDutiesGBP,
    isDutiesUnusuallyHigh: currentDutiesGBP > input.grossMarginGBP * 0.25,
  };
}

/**
 * Get a short version of alternative description (without prefix)
 */
export function getAlternativeDescriptionShort(
  alternativeDescription?: string,
): string {
  if (!alternativeDescription) return "";

  // Remove "Supplier → " prefix if present
  return alternativeDescription.replace(/^Supplier → /, "");
}

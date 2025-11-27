"use client";

import React from "react";
import { TradeProvider, useTrade } from "@/contexts/TradeContext";
import { WizardShell } from "@/components/trade/WizardShell";
import { StepItemDetails } from "@/components/trade/StepItemDetails";
import { StepPricing } from "@/components/trade/StepPricing";
import { StepSupplierBuyer } from "@/components/trade/StepSupplierBuyer";
import { StepLogisticsTax } from "@/components/trade/StepLogisticsTax";
import { StepReview } from "@/components/trade/StepReview";

function WizardContent() {
  const { state, resetKey } = useTrade();

  return (
    <div className="w-full" key={resetKey}>
      {/* Step 0: Item Details */}
      <div className={state.currentStep === 0 ? "block w-full" : "hidden w-full"}>
        <StepItemDetails />
      </div>

      {/* Step 1: Pricing */}
      <div className={state.currentStep === 1 ? "block w-full" : "hidden w-full"}>
        <StepPricing />
      </div>

      {/* Step 2: Supplier & Buyer */}
      <div className={state.currentStep === 2 ? "block w-full" : "hidden w-full"}>
        <StepSupplierBuyer />
      </div>

      {/* Step 3: Logistics & Tax */}
      <div className={state.currentStep === 3 ? "block w-full" : "hidden w-full"}>
        <StepLogisticsTax />
      </div>

      {/* Step 4: Review & Create */}
      <div className={state.currentStep === 4 ? "block w-full" : "hidden w-full"}>
        <StepReview />
      </div>
    </div>
  );
}

export default function NewTradePage() {
  return (
    <TradeProvider>
      <WizardShell>
        <WizardContent />
      </WizardShell>
    </TradeProvider>
  );
}

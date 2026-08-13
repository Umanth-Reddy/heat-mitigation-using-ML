"use client";

import React, { useState } from "react";

interface JudgeDemoGuideProps {
  onClose: () => void;
  onExecuteStep: (stepNumber: number) => void;
}

export default function JudgeDemoGuide({ onClose, onExecuteStep }: JudgeDemoGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      number: 1,
      title: "1. City Overview & LST Hotspots",
      description: "Explore the continuous density LST heatmap layer over Connaught Place. Note the street map visible underneath, LST histogram, and top 5 hotspot blocks.",
      actionLabel: "Show 2D City Overview",
    },
    {
      number: 2,
      title: "2. 3D Block Extrusion Zoom",
      description: "Click a hotspot block (e.g., Barakhamba Road CELL_07_12) to fly into 3D view with real OSM building footprints extruded by height and shaded by thermal driver values.",
      actionLabel: "Zoom to Hotspot Block",
    },
    {
      number: 3,
      title: "3. Object Heat Attribution & SHAP",
      description: "Click an extruded building to view its heat contribution popup, then open the SHAP driver attribution chart and surface energy balance split.",
      actionLabel: "Select Hot Building",
    },
    {
      number: 4,
      title: "4. Microclimate Tree Cooling",
      description: "Click a scattered tree canopy icon in the 3D block view to contrast positive building heat with negative vegetation cooling.",
      actionLabel: "Select Tree Canopy",
    },
    {
      number: 5,
      title: "5. Scenario Toggle",
      description: "Toggle 'After Interventions' on the header to see the heatmap layer cool visually across the entire ward.",
      actionLabel: "Toggle After Scenario",
    },
    {
      number: 6,
      title: "6. Optimization Matrix & Budget Slider",
      description: "Open the Recommended Interventions panel to view the Cost vs. Cooling scatter matrix and adjust the budget slider (₹10L, ₹50L, ₹1Cr).",
      actionLabel: "Open Optimization Panel",
    },
  ];

  const step = steps[currentStep - 1];

  const handleNext = () => {
    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onExecuteStep(nextStep);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onExecuteStep(prevStep);
    }
  };

  const handleSelectStep = (num: number) => {
    setCurrentStep(num);
    onExecuteStep(num);
  };

  return (
    <div className="absolute bottom-6 right-6 z-50 bg-slate-950/95 border border-slate-800 rounded-lg p-4 w-88 md:w-96 backdrop-blur-md shadow-2xl animate-in fade-in duration-200 text-slate-200">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
        <div>
          <h3 className="text-xs font-bold text-slate-100">Judge Walkthrough Guide</h3>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
            Step {currentStep} of {steps.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 text-xs px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        {steps.map((s) => (
          <button
            key={s.number}
            onClick={() => handleSelectStep(s.number)}
            className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-colors ${
              s.number === currentStep
                ? "bg-emerald-500 text-slate-950"
                : s.number < currentStep
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/40"
                : "bg-slate-900 text-slate-500 border border-slate-800"
            }`}
          >
            {s.number}
          </button>
        ))}
      </div>

      <div className="bg-slate-900/80 p-3 rounded border border-slate-800 mb-3 text-xs">
        <h4 className="font-bold text-emerald-300 mb-1">{step.title}</h4>
        <p className="text-slate-300 text-[11px] leading-relaxed">{step.description}</p>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold border border-slate-700 transition-colors"
        >
          ← Prev
        </button>

        <button
          onClick={() => onExecuteStep(currentStep)}
          className="flex-1 py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors text-center text-xs"
        >
          {step.actionLabel}
        </button>

        <button
          onClick={handleNext}
          disabled={currentStep === steps.length}
          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold border border-slate-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { CarModel } from "@/data/models";

type CustomizationPanelProps = {
  model: CarModel;
};

const colors = ["Alpine White", "Black Sapphire", "Portimao Blue", "Frozen Grey"];
const wheels = ["18-inch M Sport", "19-inch M Y-Spoke", "20-inch Aerodynamic"];
const interiors = ["Black Leather", "Cognac Leather", "Ivory White Interior"];

export default function CustomizationPanel({ model }: CustomizationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="mb-3 inline-block w-full rounded-lg border border-white/15 bg-gradient-to-r from-[#1e4a86] to-[#2962ae] px-3 py-2 text-sm font-medium text-slate-100 lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        Open Customization Drawer
      </button>
      <div
        className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"} lg:static lg:z-auto lg:pointer-events-auto`}
      >
        <aside
          className={`absolute right-0 top-0 z-[7] h-full w-[min(340px,85vw)] translate-x-full border-l border-white/15 bg-gradient-to-b from-[rgba(22,39,65,0.95)] to-[rgba(8,13,24,0.98)] p-4 transition-transform ${isOpen ? "translate-x-0" : ""} lg:relative lg:h-auto lg:w-auto lg:translate-x-0 lg:rounded-2xl lg:border lg:border-white/15 lg:bg-gradient-to-b lg:from-[rgba(22,39,65,0.8)] lg:to-[rgba(8,13,24,0.88)]`}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Customize</h2>
            <button
              className="rounded-md border border-white/15 px-2.5 py-1.5 text-sm text-slate-100 lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold">Paint</h3>
            {colors.map((item) => (
              <button
                key={item}
                className="mb-2 block w-full rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold">Wheels</h3>
            {wheels.map((item) => (
              <button
                key={item}
                className="mb-2 block w-full rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-semibold">Interior</h3>
            {interiors.map((item) => (
              <button
                key={item}
                className="mb-2 block w-full rounded-md border border-white/15 bg-[rgba(9,18,31,0.65)] px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-300">
            Three.js integration placeholder for {model.name} GLTF model.
          </p>
        </aside>
        <button
          type="button"
          aria-label="Close customization drawer"
          className="absolute inset-0 z-[5] border-0 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      </div>
    </>
  );
}

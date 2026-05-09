"use client";

import { useState } from "react";
import type { CarModel } from "@/data/models";
import CustomizationViewer from "./CustomizationViewer";
import CustomizationPanel from "./CustomizationPanel";

export type WheelStyle = "classic" | "sport" | "aero";

type Props = {
  model: CarModel;
};

export default function CustomizationApp({ model }: Props) {
  const [exterior, setExterior] = useState<string>("#1f2937");
  const [interior, setInterior] = useState<string>("#0b1220");
  const [wheelColor, setWheelColor] = useState<string>("#cfd6df");
  const [wheelStyle, setWheelStyle] = useState<WheelStyle>("classic");
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [windowsDown, setWindowsDown] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-none px-4 py-6 lg:px-8">
      <div className="grid min-h-0 w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-[3fr_1fr]">
        {/* 左边 3/4 */}
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="shrink-0">
            <p className="m-0 text-xs uppercase tracking-[0.22em] text-[#4f8de6]">
              Model Customization
            </p>

            <h1 className="my-2 text-4xl font-bold text-slate-100">
              {model.name}
            </h1>

            <p className="text-slate-300">{model.description}</p>
          </div>

          <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/15">
            <CustomizationViewer
              model={model}
              exteriorColor={exterior}
              interiorColor={interior}
              wheelColor={wheelColor}
              wheelStyle={wheelStyle}
              doorsOpen={doorsOpen}
              windowsDown={windowsDown}
              lightsOn={lightsOn}
            />
          </div>
        </div>

        {/* 右边 1/4 */}
        <div className="min-h-0 min-w-0 lg:sticky lg:top-[88px] lg:h-[calc(100vh-120px)] lg:overflow-y-auto">
          <CustomizationPanel
            model={model}
            doorsOpen={doorsOpen}
            windowsDown={windowsDown}
            lightsOn={lightsOn}
            onExteriorChange={(c: string) => setExterior(c)}
            onInteriorChange={(c: string) => setInterior(c)}
            onWheelColorChange={(c: string) => setWheelColor(c)}
            onWheelStyleChange={setWheelStyle}
            onDoorsOpenChange={setDoorsOpen}
            onWindowsDownChange={setWindowsDown}
            onLightsOnChange={setLightsOn}
          />
        </div>
      </div>
    </div>
  );
}

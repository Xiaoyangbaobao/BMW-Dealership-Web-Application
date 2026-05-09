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
  const [wheelFocusNonce, setWheelFocusNonce] = useState(0);

  return (
    <div className="mx-auto flex h-[calc(100vh-96px)] w-full max-w-none overflow-hidden px-0 py-0">
      <div className="grid min-h-0 w-full grid-cols-1 items-stretch gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* 左边全屏车辆视图 */}
        <div className="relative flex min-h-0 min-w-0 flex-col">
          <div className="pointer-events-none absolute left-6 top-6 z-10 max-w-xl rounded-2xl border border-white/10 bg-black/35 px-5 py-4 shadow-2xl backdrop-blur-md">
            <p className="m-0 text-xs uppercase tracking-[0.22em] text-[#4f8de6]">
              Model Customization
            </p>
            <h1 className="my-1 text-3xl font-bold text-slate-100">
              {model.name}
            </h1>

            <p className="text-slate-300">{model.description}</p>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden border-r border-white/15">
            <CustomizationViewer
              model={model}
              exteriorColor={exterior}
              interiorColor={interior}
              wheelColor={wheelColor}
              wheelStyle={wheelStyle}
              doorsOpen={doorsOpen}
              windowsDown={windowsDown}
              lightsOn={lightsOn}
              wheelFocusNonce={wheelFocusNonce}
            />
          </div>
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

        {/* 右边 1/4 */}
        <div className="min-h-0 min-w-0 border-l border-white/10 bg-[#071020] lg:h-[calc(100vh-96px)] lg:overflow-y-auto">
          <CustomizationPanel
            model={model}
            doorsOpen={doorsOpen}
            windowsDown={windowsDown}
            lightsOn={lightsOn}
            onExteriorChange={(c: string) => setExterior(c)}
            onInteriorChange={(c: string) => setInterior(c)}
            onWheelColorChange={(c: string) => {
              setWheelColor(c);
              setWheelFocusNonce((value) => value + 1);
            }}
            onWheelStyleChange={(style) => {
              setWheelStyle(style);
              setWheelFocusNonce((value) => value + 1);
            }}
            onDoorsOpenChange={setDoorsOpen}
            onWindowsDownChange={setWindowsDown}
            onLightsOnChange={setLightsOn}
          />
        </div>
      </div>
    </div>
  );
}

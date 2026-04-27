import Image from "next/image";
import { notFound } from "next/navigation";
import CustomizationPanel from "@/components/CustomizationPanel";
import { getModelById } from "@/data/models";

type CustomizationPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CustomizationPage({ params }: CustomizationPageProps) {
  const { slug } = await params;
  const model = getModelById(slug);

  if (!model) {
    notFound();
  }

  return (
    <section className="px-0 pb-12 pt-8">
      <div className="mx-auto grid w-[min(1120px,calc(100%-2rem))] grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="m-0 text-xs uppercase tracking-[0.11em] text-[#4f8de6]">Model Customization</p>
          <h1 className="my-2 text-4xl font-bold text-slate-100">{model.name}</h1>
          <p className="text-slate-300">{model.description}</p>
          <div className="mb-4 mt-3 flex flex-wrap gap-3">
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-[#deebff]">
              {model.series}
            </span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-[#deebff]">
              {model.horsepower} hp
            </span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 text-sm text-[#deebff]">
              ${model.price.toLocaleString("en-AU")}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/15">
            <Image
              src={model.heroImage}
              alt={model.name}
              width={1200}
              height={800}
              className="block h-auto w-full"
            />
            <div className="absolute bottom-3 left-3 rounded-md border border-white/15 bg-black/55 px-2.5 py-1.5 text-sm">
              3D viewport placeholder (GLTF + Three.js)
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-[88px]">
          <CustomizationPanel model={model} />
        </div>
      </div>
    </section>
  );
}

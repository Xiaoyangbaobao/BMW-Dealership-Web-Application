import Image from "next/image";
import Link from "next/link";
import type { CarModel } from "@/data/models";

type ModelCardProps = {
  model: CarModel;
};

export default function ModelCard({ model }: ModelCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-[rgba(22,39,65,0.72)] to-[rgba(8,13,24,0.85)]">
      <div className="aspect-[16/10] overflow-hidden">
        <Image
          src={model.heroImage}
          alt={model.name}
          width={640}
          height={420}
          className="h-full w-full object-cover"
          priority={false}
        />
      </div>
      <div className="p-4">
        <p className="mt-0 text-xs uppercase tracking-[0.08em] text-[#4f8de6]">{model.series}</p>
        <h3 className="my-1 text-xl font-semibold text-slate-100">{model.name}</h3>
        <p className="text-sm text-slate-300">{model.description}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#d7e2f9]">
          <span>{model.year}</span>
          <span>{model.horsepower} hp</span>
          <span>{model.range}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="m-0 font-bold">
            From ${model.price.toLocaleString("en-AU")}
          </p>
          <Link
            href={`/customization/${model.id}`}
            className="rounded-md border border-white/15 px-3 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Customize
          </Link>
        </div>
      </div>
    </article>
  );
}

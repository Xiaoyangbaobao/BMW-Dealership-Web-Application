import ModelCard from "@/components/ModelCard";
import { bmwModels } from "@/data/models";

export default function ModelsPage() {
  return (
    <section className="px-0 pb-12 pt-8">
      <div className="mx-auto w-[min(1120px,calc(100%-2rem))]">
        <p className="m-0 text-xs uppercase tracking-[0.11em] text-[#4f8de6]">BMW Collection</p>
        <h1 className="mb-1 mt-2 text-4xl font-bold text-slate-100">Select a model to customize</h1>
        <p className="text-slate-300">
          Choose from our curated lineup and continue to the customization page
          to configure your selected BMW.
        </p>
      </div>
      <div className="mx-auto mt-4 grid w-[min(1120px,calc(100%-2rem))] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bmwModels.map((model) => (
          <ModelCard key={model.id} model={model} />
        ))}
      </div>
    </section>
  );
}

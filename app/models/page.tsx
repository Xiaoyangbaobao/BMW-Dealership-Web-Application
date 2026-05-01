import ModelCard from "@/components/ModelCard";
import { bmwModels } from "@/data/models";

export default function ModelsPage() {
  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#030711] p-3 sm:p-4">
      <div className="h-[calc(100vh-96px)] min-h-[720px] w-full">
        <ModelCard models={bmwModels} />
      </div>
    </section>
  );
}

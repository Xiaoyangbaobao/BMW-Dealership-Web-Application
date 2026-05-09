import { notFound } from "next/navigation";
import { getModelById } from "@/data/models";
import CustomizationApp from "@/components/CustomizationApp";

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
    <section className="min-h-[calc(100vh-72px)] bg-[#030711] p-3 sm:p-4">
      <div className="h-[calc(100vh-96px)] min-h-[720px] w-full">
        <CustomizationApp model={model} />
      </div>
    </section>
  );
}

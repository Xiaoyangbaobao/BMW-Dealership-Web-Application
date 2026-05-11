import { notFound } from "next/navigation";
import DriveAwayShowcase from "@/components/DriveAwayShowcase";
import { getModelById } from "@/data/models";
import type { WheelStyle } from "@/components/CustomizationApp";

type DriveAwayPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    exterior?: string;
    interior?: string;
    wheel?: string;
    wheelStyle?: string;
  }>;
};

export default async function DriveAwayPage({ params, searchParams }: DriveAwayPageProps) {
  const { slug } = await params;
  const model = getModelById(slug);

  if (!model) {
    notFound();
  }

  const query = await searchParams;
  const wheelStyle = isWheelStyle(query.wheelStyle) ? query.wheelStyle : undefined;

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#030711] p-3 sm:p-4">
      <DriveAwayShowcase
        model={model}
        exteriorColor={query.exterior}
        interiorColor={query.interior}
        wheelColor={query.wheel}
        wheelStyle={wheelStyle}
      />
    </section>
  );
}

function isWheelStyle(value: string | undefined): value is WheelStyle {
  return value === "classic" || value === "sport" || value === "aero";
}

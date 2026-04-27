import Link from "next/link";

export default function HomePage() {
  return (
    <section className="px-0 pb-12 pt-16">
      <div className="mx-auto grid w-[min(1120px,calc(100%-2rem))] grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="m-0 text-xs uppercase tracking-[0.11em] text-[#4f8de6]">BMW Luxury Experience</p>
          <h1 className="my-3 text-4xl font-bold leading-tight text-slate-100 md:text-5xl">
            Drive Your Dream BMW with a Premium Digital Showroom
          </h1>
          <p className="max-w-[60ch] text-slate-300">
            Discover our latest BMW lineup, explore model details, and start
            your customization journey with a premium and responsive web
            experience.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/models"
              className="inline-block rounded-lg bg-gradient-to-r from-[#24579f] to-[#3a7ddd] px-4 py-2.5 font-semibold text-white"
            >
              Browse Models
            </Link>
            <Link
              href="/models"
              className="inline-block rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-slate-100"
            >
              Start Customizing
            </Link>
          </div>
        </div>
        <div className="min-h-[250px] rounded-2xl border border-white/15 bg-gradient-to-b from-[rgba(17,27,45,0.85)] to-[rgba(8,14,25,0.9)] p-5">
          <p className="mt-0 text-[#4f8de6]">Upcoming 3D Experience</p>
          <h2 className="text-2xl font-semibold text-slate-100">
            Three.js customization will be integrated here later.
          </h2>
        </div>
      </div>
    </section>
  );
}

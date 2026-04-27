import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto w-[min(1120px,calc(100%-2rem))] py-16">
      <h1 className="text-3xl font-bold text-slate-100">Model not found</h1>
      <p className="mt-2 text-slate-300">
        The selected BMW model does not exist in the current dummy dataset.
      </p>
      <Link
        href="/models"
        className="mt-5 inline-block rounded-lg bg-gradient-to-r from-[#24579f] to-[#3a7ddd] px-4 py-2.5 font-semibold text-white"
      >
        Back to Models
      </Link>
    </section>
  );
}

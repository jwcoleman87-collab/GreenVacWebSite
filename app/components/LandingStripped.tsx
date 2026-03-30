'use client'

import Link from "next/link";
import { usePostHog } from "posthog-js/react";

export default function LandingStripped() {
  const posthog = usePostHog();

  const trackCTA = () => {
    posthog?.capture("cta_clicked", { cta: "hero_get_quote", page: "home", variant: "stripped" });
  };

  return (
    <section className="bg-green-700 text-white min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-extrabold mb-6 leading-tight max-w-2xl">
        Professional Eco-Friendly Cleaning — Book Today
      </h1>
      <p className="text-xl text-green-100 max-w-xl mb-10">
        Safe for your family, safe for the planet. Serving homes and businesses
        with certified green cleaning products.
      </p>
      <Link
        href="/contact"
        className="bg-white text-green-800 font-bold px-10 py-4 rounded-full text-lg hover:bg-green-100 shadow-lg"
        onClick={trackCTA}
      >
        Get a Free Quote
      </Link>
    </section>
  );
}

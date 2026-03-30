'use client'

import Link from "next/link";
import { usePostHog } from "posthog-js/react";

const services = [
  {
    icon: "🏠",
    title: "Residential Cleaning",
    description: "Deep cleans, routine maintenance, and move-in/out services.",
    slug: "residential",
  },
  {
    icon: "🏢",
    title: "Commercial Cleaning",
    description: "Office spaces, retail stores, and multi-unit properties.",
    slug: "commercial",
  },
  {
    icon: "🌿",
    title: "Eco-Friendly Products",
    description: "100% non-toxic, biodegradable cleaning solutions.",
    slug: "eco",
  },
];

export default function LandingFull() {
  const posthog = usePostHog();

  const trackCTA = (ctaName: string) => {
    posthog?.capture("cta_clicked", { cta: ctaName, page: "home", variant: "control" });
  };

  const trackServiceCard = (slug: string, title: string) => {
    posthog?.capture("service_card_clicked", {
      service_slug: slug,
      service_title: title,
      page: "home",
    });
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-green-700 text-white py-24 px-4 text-center">
        <h1 className="text-5xl font-extrabold mb-4 leading-tight">
          A Cleaner Home.<br />A Greener Planet.
        </h1>
        <p className="text-xl text-green-100 max-w-xl mx-auto mb-8">
          Professional eco-friendly cleaning services for homes and businesses.
          Safe for your family, safe for the earth.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/contact"
            className="bg-white text-green-800 font-bold px-8 py-3 rounded-full hover:bg-green-100 transition shadow-lg"
            onClick={() => trackCTA("hero_get_quote")}
          >
            Get a Free Quote
          </Link>
          <Link
            href="/services"
            className="border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-green-600 transition"
            onClick={() => trackCTA("hero_view_services")}
          >
            Our Services
          </Link>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-green-800 mb-10">
            What We Offer
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {services.map((s) => (
              <Link
                key={s.slug}
                href="/services"
                className="border border-green-200 rounded-2xl p-6 hover:shadow-lg hover:border-green-400 transition group"
                onClick={() => trackServiceCard(s.slug, s.title)}
              >
                <div className="text-5xl mb-4">{s.icon}</div>
                <h3 className="text-xl font-bold text-green-800 mb-2 group-hover:text-green-600">
                  {s.title}
                </h3>
                <p className="text-gray-600">{s.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="bg-green-50 py-12 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-around gap-8 text-center">
          {[
            { stat: "500+", label: "Happy Clients" },
            { stat: "8 yrs", label: "In Business" },
            { stat: "100%", label: "Eco Products" },
            { stat: "5★", label: "Average Rating" },
          ].map(({ stat, label }) => (
            <div key={label}>
              <p className="text-4xl font-extrabold text-green-700">{stat}</p>
              <p className="text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 bg-green-800 text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready for a Spotless Space?</h2>
        <p className="text-green-200 mb-8 max-w-lg mx-auto">
          Book your first cleaning today and get 15% off with code{" "}
          <span className="font-bold text-white">GREENFIRST</span>.
        </p>
        <Link
          href="/contact"
          className="bg-white text-green-800 font-bold px-10 py-4 rounded-full hover:bg-green-100 transition shadow-lg text-lg"
          onClick={() => trackCTA("bottom_book_now")}
        >
          Book Now
        </Link>
      </section>
    </>
  );
}

'use client'

import { usePostHog } from "posthog-js/react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const services = [
  {
    icon: "🏠",
    title: "Residential Cleaning",
    description:
      "We handle everything from routine weekly tidying to full deep-clean sessions. Move-in/out packages available.",
    price: "From $89",
    slug: "residential",
  },
  {
    icon: "🏢",
    title: "Commercial Cleaning",
    description:
      "After-hours office cleaning, common areas, kitchens, restrooms, and lobby maintenance on any schedule.",
    price: "From $149",
    slug: "commercial",
  },
  {
    icon: "🌿",
    title: "Eco-Friendly Deep Clean",
    description:
      "Our signature full-home treatment using certified non-toxic products — safe for kids and pets.",
    price: "From $199",
    slug: "eco-deep",
  },
  {
    icon: "🪟",
    title: "Window & Exterior",
    description:
      "Interior and exterior window cleaning, pressure washing, and entryway detail.",
    price: "From $69",
    slug: "windows",
  },
  {
    icon: "📦",
    title: "Move-In / Move-Out",
    description:
      "Leave your old place spotless or welcome a fresh start. Includes appliances, cabinets, and blinds.",
    price: "From $249",
    slug: "move",
  },
  {
    icon: "🗓️",
    title: "Recurring Plans",
    description:
      "Weekly, bi-weekly, or monthly plans with guaranteed consistency and priority scheduling.",
    price: "From $75/visit",
    slug: "recurring",
  },
];

export default function ServicesPage() {
  const posthog = usePostHog();

  const trackBookService = (slug: string, title: string) => {
    posthog?.capture("service_book_clicked", {
      service_slug: slug,
      service_title: title,
      page: "services",
    });
  };

  return (
    <>
      <Navbar />
      <section className="bg-green-700 text-white py-16 px-4 text-center">
        <h1 className="text-4xl font-extrabold mb-3">Our Services</h1>
        <p className="text-green-100 text-lg max-w-xl mx-auto">
          Choose the cleaning solution that fits your life. All services use
          100% eco-certified products.
        </p>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((s) => (
            <div
              key={s.slug}
              className="border border-green-200 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="text-4xl mb-3">{s.icon}</div>
                <h3 className="text-xl font-bold text-green-800 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{s.description}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-green-700 font-semibold">{s.price}</span>
                <a
                  href="/contact"
                  className="bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-green-600 transition"
                  onClick={() => trackBookService(s.slug, s.title)}
                >
                  Book
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </>
  );
}

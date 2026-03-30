'use client'

import Link from "next/link";
import { usePostHog } from "posthog-js/react";

export default function Navbar() {
  const posthog = usePostHog();

  const trackNavClick = (label: string) => {
    posthog?.capture("nav_link_clicked", { label });
  };

  return (
    <nav className="bg-green-800 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight hover:text-green-200 transition"
          onClick={() => trackNavClick("logo")}
        >
          🌿 GreenVac
        </Link>
        <div className="flex gap-6 text-sm font-medium">
          {[
            { href: "/", label: "Home" },
            { href: "/services", label: "Services" },
            { href: "/about", label: "About" },
            { href: "/contact", label: "Contact" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-green-300 transition"
              onClick={() => trackNavClick(label)}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

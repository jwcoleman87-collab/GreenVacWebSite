'use client'

import Link from "next/link";
import { usePostHog, useFeatureFlagVariantKey } from "posthog-js/react";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingFull from "./components/LandingFull";
import LandingStripped from "./components/LandingStripped";

export default function Home() {
  const posthog = usePostHog();
  const variant = useFeatureFlagVariantKey("landing-page-variant");

  useEffect(() => {
    if (variant !== undefined) {
      posthog?.capture("landing_variant_viewed", {
        variant: variant ?? "control",
      });
    }
  }, [variant, posthog]);

  // Show stripped variant when flag returns 'stripped'; fall back to full.
  const showStripped = variant === "stripped";

  return (
    <>
      <Navbar />
      {showStripped ? <LandingStripped /> : <LandingFull />}
      <Footer />
    </>
  );
}

import { CallToAction } from "@/components/landing/cta";
import { Faq } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { Pricing } from "@/components/landing/pricing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <Faq />
      <CallToAction />
    </>
  );
}

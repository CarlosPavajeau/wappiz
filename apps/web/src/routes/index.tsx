import { createFileRoute } from "@tanstack/react-router"

import { NavigationBar } from "@/components/landing/layout/navigation-bar"
import { CtaSection } from "@/components/landing/sections/cta-section"
import { FeaturesSection } from "@/components/landing/sections/features-section"
import { FooterSection } from "@/components/landing/sections/footer-section"
import { HeroSection } from "@/components/landing/sections/hero-section"
import { PricingSection } from "@/components/landing/sections/pricing-section"

export const Route = createFileRoute("/")({
  component: HomeComponent,
  head: () => ({
    meta: [
      {
        description:
          "Permite que tus clientes agenden citas directamente desde WhatsApp. Gestiona recursos, servicios y disponibilidad en un solo lugar.",
        title: "wappiz — Citas por WhatsApp",
      },
      {
        content:
          "Permite que tus clientes agenden citas directamente desde WhatsApp. Gestiona recursos, servicios y disponibilidad en un solo lugar.",
        name: "description",
      },
    ],
  }),
})

function HomeComponent() {
  return (
    <main className="bg-background text-foreground relative h-dvh overflow-x-hidden">
      <NavigationBar />

      <HeroSection />

      <FeaturesSection />

      <PricingSection />

      <CtaSection />

      <FooterSection />
    </main>
  )
}

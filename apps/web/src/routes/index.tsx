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
    links: [
      {
        href: "https://wappiz.cantte.com/",
        rel: "canonical",
      },
    ],
    meta: [
      {
        title: "Agenda Citas por WhatsApp — wappiz",
      },
      {
        content:
          "Permite que tus clientes reserven citas directamente por WhatsApp. Gestiona servicios, recursos y disponibilidad en un solo lugar. Prueba gratis.",
        name: "description",
      },
      {
        content:
          "citas por WhatsApp, agendar citas WhatsApp, agendamiento por WhatsApp, reservar cita WhatsApp, sistema de citas, wappiz",
        name: "keywords",
      },
      {
        content: "index, follow",
        name: "robots",
      },
      {
        content: "website",
        property: "og:type",
      },
      {
        content: "Agenda Citas por WhatsApp — wappiz",
        property: "og:title",
      },
      {
        content:
          "Permite que tus clientes reserven citas directamente por WhatsApp. Gestiona servicios, recursos y disponibilidad en un solo lugar.",
        property: "og:description",
      },
      {
        content: "https://wappiz.cantte.com/",
        property: "og:url",
      },
      {
        content: "summary_large_image",
        name: "twitter:card",
      },
      {
        content: "Agenda Citas por WhatsApp — wappiz",
        name: "twitter:title",
      },
      {
        content:
          "Permite que tus clientes reserven citas directamente por WhatsApp. Gestiona servicios, recursos y disponibilidad.",
        name: "twitter:description",
      },
    ],
  }),
})

function HomeComponent() {
  return (
    <main className="relative overflow-x-hidden bg-background text-foreground">
      <NavigationBar />

      <HeroSection />

      <FeaturesSection />

      <PricingSection />

      <CtaSection />

      <FooterSection />
    </main>
  )
}

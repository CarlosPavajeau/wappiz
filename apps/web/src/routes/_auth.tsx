import {
  BubbleChatIcon,
  Calendar01Icon,
  Notification01Icon,
  ScissorIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { createFileRoute, Link, Outlet } from "@tanstack/react-router"
import { useEffect, useState } from "react"

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
})

const features = [
  {
    icon: BubbleChatIcon,
    label: "Reservas directo por WhatsApp",
  },
  {
    icon: Calendar01Icon,
    label: "Agenda centralizada y sencilla",
  },
  {
    icon: Notification01Icon,
    label: "Recordatorios automáticos para tus clientes",
  },
  {
    icon: ScissorIcon,
    label: "Gestión de servicios y precios",
  },
]

const businessWords = [
  "barbería",
  "odontología",
  "peluquería",
  "spa",
  "estética",
  "fisioterapia",
  "veterinaria",
]

function AnimatedWord() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % businessWords.length)
        setVisible(true)
      }, 350)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <span
      className="inline-block text-primary transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
      }}
    >
      {businessWords[index]}
    </span>
  )
}

function RouteComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <div className="hidden shrink-0 flex-col justify-between bg-zinc-950 p-12 lg:flex lg:w-120 xl:w-135">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <HugeiconsIcon
                icon={BubbleChatIcon}
                size={18}
                strokeWidth={1.5}
                className="text-primary-foreground"
                aria-hidden="true"
              />
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">
              wappiz
            </span>
          </Link>

          <div className="space-y-10">
            <div className="space-y-4">
              <h1 className="text-4xl leading-tight font-bold tracking-tight text-white">
                Gestiona tu <AnimatedWord /> con WhatsApp
              </h1>
              <p className="text-base leading-relaxed text-white/60">
                Reservas, recordatorios y clientes en un solo lugar. Sin apps
                extra.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8">
                    <HugeiconsIcon
                      icon={Icon}
                      size={16}
                      strokeWidth={1.5}
                      className="text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="text-sm text-white/75">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} wappiz
          </p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="flex items-center justify-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <HugeiconsIcon
                  icon={BubbleChatIcon}
                  size={18}
                  strokeWidth={1.5}
                  className="text-primary-foreground"
                  aria-hidden="true"
                />
              </div>
              <span className="text-xl font-semibold tracking-tight">
                wappiz
              </span>
            </Link>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

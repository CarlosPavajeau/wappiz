import { Link } from "@tanstack/react-router"

import { Section, SectionContent } from "../layout/section"

const navLinks = [
  { external: false, href: "/privacy", label: "Política de privacidad" },
]

export function FooterSection() {
  return (
    <Section last>
      <SectionContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 sm:justify-start">
            {navLinks.map((link, i) => (
              <span key={link.label} className="flex items-center">
                <Link
                  to={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="inline-block py-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
                {i < navLinks.length - 1 && (
                  <span className="mx-2 text-xs text-foreground/15 select-none">
                    /
                  </span>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">
              © {new Date().getFullYear()} Wappiz
            </span>
          </div>
        </div>
      </SectionContent>
    </Section>
  )
}

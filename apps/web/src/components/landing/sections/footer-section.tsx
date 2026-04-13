import { Link } from "@tanstack/react-router"

import { Section, SectionContent } from "../layout/section"

const navLinks = [
  { label: "Política de privacidad", href: "/privacy", external: false },
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
                  className="text-foreground/45 hover:text-foreground/70 font-mono text-xs transition-colors"
                >
                  {link.label}
                </Link>
                {i < navLinks.length - 1 && (
                  <span className="text-foreground/15 mx-2 text-xs select-none">
                    /
                  </span>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-foreground/45 dark:text-foreground/30 font-mono text-xs">
              © {new Date().getFullYear()} Wappiz
            </span>
          </div>
        </div>
      </SectionContent>
    </Section>
  )
}

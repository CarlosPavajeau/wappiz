import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type {
  PublicResource,
  PublicService,
} from "@wappiz/api-client/types/public-booking"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

type Props = {
  onBack: () => void
  /** `null` books whichever resource is free */
  onPick: (resourceId: string | null) => void
  resources: PublicResource[]
  service: PublicService
}

export function ResourceStep({ onBack, onPick, resources, service }: Props) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Volver a servicios"
          onClick={onBack}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <h2 className="text-base font-medium">{service.name}: ¿con quién?</h2>
      </div>

      <ul className="flex flex-col gap-2">
        <li>
          <ResourceOption
            onClick={() => onPick(null)}
            hint="Más horarios disponibles"
            label="Cualquiera disponible"
            media={
              <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <HugeiconsIcon
                  icon={UserGroupIcon}
                  strokeWidth={2}
                  className="size-5"
                  aria-hidden="true"
                />
              </span>
            }
          />
        </li>
        {resources.map((resource) => (
          <li key={resource.id}>
            <ResourceOption
              onClick={() => onPick(resource.id)}
              label={resource.name}
              media={
                <Avatar size="lg">
                  <AvatarImage src={resource.avatarUrl} alt="" />
                  <AvatarFallback>{resource.name.charAt(0)}</AvatarFallback>
                </Avatar>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

type ResourceOptionProps = {
  hint?: string
  label: string
  media: React.ReactNode
  onClick: () => void
}

function ResourceOption({ hint, label, media, onClick }: ResourceOptionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {media}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{label}</span>
        {hint !== undefined && (
          <span className="text-xs text-muted-foreground">{hint}</span>
        )}
      </span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  )
}

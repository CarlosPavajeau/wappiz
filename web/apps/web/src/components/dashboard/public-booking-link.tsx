import { Copy01Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useSyncExternalStore } from "react"
import { toast } from "sonner"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

type Props = {
  slug: string
}

/**
 * Read-only booking URL with copy and open actions. The origin is only
 * known in the browser, so the server renders the path alone.
 */
export function PublicBookingLink({ slug }: Props) {
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => ""
  )

  const url = `${origin}/${slug}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Enlace copiado")
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  return (
    <InputGroup>
      <InputGroupInput
        readOnly
        value={url}
        aria-label="Enlace de reservas"
        onFocus={(event) => event.currentTarget.select()}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          aria-label="Copiar enlace"
          size="icon-xs"
          onClick={copy}
        >
          <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
        </InputGroupButton>
        <InputGroupButton
          size="icon-xs"
          nativeButton={false}
          render={
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir página de reservas"
            />
          }
        >
          <HugeiconsIcon icon={LinkSquare02Icon} strokeWidth={2} />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

// The origin never changes while the page is open, so there is nothing to
// subscribe to and nothing to clean up.
function subscribeToNothing() {
  return unsubscribeFromNothing
}

function unsubscribeFromNothing() {
  // Nothing was subscribed.
}

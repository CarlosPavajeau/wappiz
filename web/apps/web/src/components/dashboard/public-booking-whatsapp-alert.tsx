import { Alert02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type Props = {
  publicBookingEnabled: boolean
  whatsappReady: boolean
}

// Booking confirmations are only sent over WhatsApp, so the public page is
// hidden while WhatsApp cannot send. Tell the owner why their link is dead.
export function PublicBookingWhatsappAlert({
  publicBookingEnabled,
  whatsappReady,
}: Props) {
  if (!publicBookingEnabled || whatsappReady) {
    return null
  }

  return (
    <Alert variant="destructive">
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} aria-hidden="true" />
      <AlertTitle>Tu página de reservas no está disponible</AlertTitle>
      <AlertDescription>
        Tu WhatsApp no está conectado o activo, así que no podemos enviar la
        confirmación de las citas. Mientras tanto, tus clientes no pueden
        reservar desde tu enlace.
      </AlertDescription>
    </Alert>
  )
}

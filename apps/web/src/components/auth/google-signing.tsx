import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { GoogleIcon } from "@/components/icons/google-icon"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"

export function GoogleSigning() {
  const { mutate: signInWithGoogle, isPending: isGooglePending } = useMutation({
    mutationFn: () =>
      authClient.signIn.social({
        callbackURL: "/dashboard",
        provider: "google",
      }),
    onError: () => {
      toast.error("No se pudo iniciar sesión con Google. Inténtalo de nuevo.")
    },
  })

  const handleGoogleSignIn = () => signInWithGoogle()

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 transition-colors duration-200"
      disabled={isGooglePending}
      onClick={handleGoogleSignIn}
      aria-label="Iniciar sesión con Google"
    >
      {isGooglePending ? (
        <Spinner className="animate-spin" />
      ) : (
        <GoogleIcon size={18} />
      )}
      Continuar con Google
    </Button>
  )
}

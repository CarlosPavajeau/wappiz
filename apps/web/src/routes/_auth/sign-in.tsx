import { arktypeResolver } from "@hookform/resolvers/arktype"
import { EyeIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { GoogleIcon } from "@/components/icons/google-icon"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { authClient } from "@/lib/auth-client"

const searchSchema = type({
  "redirect?": type("string").configure({
    message: "Invalid redirect URL",
  }),
})

export const Route = createFileRoute("/_auth/sign-in")({
  component: RouteComponent,
  validateSearch: searchSchema,
})

const signInSchema = type({
  email: type("string.email").configure({
    message: "Ingresa un correo electrónico válido",
  }),
  password: type("string >= 1").configure({
    message: "La contraseña es requerida",
  }),
})

type SignInFormData = typeof signInSchema.infer

function RouteComponent() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate({
    from: "/",
  })
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: arktypeResolver(signInSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: SignInFormData) =>
      authClient.signIn.email({
        email: data.email,
        password: data.password,
      }),
    onError: () => {
      const message = "Credenciales inválidas. Por favor, inténtalo de nuevo."
      toast.error(message)
    },
    onSuccess: (result) => {
      if (result.data) {
        if (redirect) {
          navigate({
            to: redirect,
          })
        } else {
          navigate({
            to: "/dashboard",
          })
        }
      } else if (result.error) {
        const message =
          result.error.message ??
          "Algo salió mal. Por favor, inténtalo de nuevo."
        toast.error(message)
      } else {
        toast.error("Algo salió mal. Por favor, inténtalo de nuevo.")
      }
    },
  })

  const { mutate: signInWithGoogle, isPending: isGooglePending } = useMutation({
    mutationFn: () =>
      authClient.signIn.social({
        callbackURL: "/dashboard",
        provider: "google",
        redirectTo: redirect,
      }),
    onError: () => {
      toast.error("No se pudo iniciar sesión con Google. Inténtalo de nuevo.")
    },
  })

  const togglePassword = () => setShowPassword((prev) => !prev)
  const handleGoogleSignIn = () => signInWithGoogle()

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          Bienvenido de nuevo
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Inicia sesión en tu cuenta de wappiz
        </p>
      </div>

      <form
        noValidate
        onSubmit={handleSubmit((data) => mutate(data))}
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="tu@ejemplo.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Contraseña</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="pr-9"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={togglePassword}
              >
                <HugeiconsIcon
                  icon={showPassword ? ViewOffSlashIcon : EyeIcon}
                  size={16}
                  strokeWidth={1.5}
                />
              </Button>
            </div>
            <FieldError errors={[errors.password]} />
          </Field>
        </FieldGroup>

        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {isPending && <Spinner className="animate-spin" />}
          Iniciar sesión
        </Button>

        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o continúa con</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 transition-colors duration-200"
          disabled={isGooglePending || isPending}
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
      </form>

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link
            to="/sign-up"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Crear una
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            Política de privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}

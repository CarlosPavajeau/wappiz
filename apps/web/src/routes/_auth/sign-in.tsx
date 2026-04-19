import { arktypeResolver } from "@hookform/resolvers/arktype"
import { EyeIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { GoogleSigning } from "@/components/auth/google-signing"
import { TurnstileChallenge } from "@/components/auth/turnstile-challenge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { verifyTurnstileToken } from "@/functions/verify-turnstile-token"
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
  isTurstileVerify: type("boolean").configure({
    message:
      "Verificación de Turnstile fallida. Por favor, inténtalo de nuevo.",
  }),
})

type SignInFormData = typeof signInSchema.infer

function RouteComponent() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate({
    from: "/",
  })
  const [showPassword, setShowPassword] = useState(false)

  const { handleSubmit, setValue, control, setError } = useForm({
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

  const { mutate: verifyTurnstile, isPending: isTurnstilePending } =
    useMutation({
      mutationFn: (token: string) =>
        verifyTurnstileToken({
          data: { token },
        }),
      onSuccess: (result) => {
        if (result) {
          setValue("isTurstileVerify", true)
        } else {
          setError("isTurstileVerify", {
            message:
              "La verificación de Turnstile fallida. Por favor, inténtalo de nuevo.",
          })
        }
      },
      onError: () => {
        setError("isTurstileVerify", {
          message:
            "Ha ocurrido un error al verificar la verificación de Turnstile. Por favor, inténtalo de nuevo.",
        })
      },
    })

  const togglePassword = () => setShowPassword((prev) => !prev)

  const handleTurnstileSuccess = (token: string) => {
    verifyTurnstile(token)
  }

  const handleTurnstileError = () => {
    setError("isTurstileVerify", {
      message:
        "Ha ocurrido un error al verificar la verificación de Turnstile. Por favor, inténtalo de nuevo.",
    })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Bienvenido de nuevo
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Inicia sesión en tu cuenta de wappiz
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => mutate(data))}
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Correo electrónico</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="email"
                  placeholder="tu@ejemplo.com"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Contraseña
                  <Button
                    variant="link"
                    className="ml-auto p-0"
                    size="sm"
                    render={<Link to="/reset-password" />}
                    nativeButton={false}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </FieldLabel>

                <InputGroup>
                  <InputGroupInput
                    {...field}
                    id={field.name}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    aria-invalid={fieldState.invalid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label={
                        showPassword
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      size="icon-xs"
                      onClick={togglePassword}
                    >
                      <HugeiconsIcon
                        icon={showPassword ? ViewOffSlashIcon : EyeIcon}
                        strokeWidth={2}
                      />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>

        <Controller
          control={control}
          name="isTurstileVerify"
          render={({ fieldState }) => (
            <Field>
              <TurnstileChallenge
                onSuccess={handleTurnstileSuccess}
                onError={handleTurnstileError}
              />

              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button
          type="submit"
          className="mt-2 w-full"
          disabled={isPending || isTurnstilePending}
        >
          {isPending && <Spinner className="animate-spin" />}
          Iniciar sesión
        </Button>

        <div className="relative flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">o continúa con</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <GoogleSigning />
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

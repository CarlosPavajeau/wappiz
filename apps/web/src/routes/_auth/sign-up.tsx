import { arktypeResolver } from "@hookform/resolvers/arktype"
import { EyeIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { TurnstileChallenge } from "@/components/auth/turnstile-challenge"
import { GoogleIcon } from "@/components/icons/google-icon"
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

export const Route = createFileRoute("/_auth/sign-up")({
  component: RouteComponent,
})

const signUpSchema = type({
  confirmPassword: type("string").configure({
    message: "La confirmación de contraseña es requerida",
  }),
  email: type("string.email").configure({
    message: "Ingresa un correo electrónico válido",
  }),
  name: type("string >= 2").configure({
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  password: type("string >= 8").configure({
    message: "La contraseña debe tener al menos 8 caracteres",
  }),
  isTurstileVerify: type("boolean").configure({
    message:
      "Verificación de Turnstile fallida. Por favor, inténtalo de nuevo.",
  }),
})

type SignUpFormData = typeof signUpSchema.infer

function RouteComponent() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate({
    from: "/",
  })

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
    setValue,
  } = useForm<SignUpFormData>({
    resolver: arktypeResolver(signUpSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Omit<SignUpFormData, "confirmPassword">) =>
      authClient.signUp.email({
        email: data.email,
        name: data.name,
        password: data.password,
      }),
    onError: () => {
      const message = "El registro falló. Por favor, inténtalo de nuevo."
      toast.error(message)
    },
    onSuccess: (result) => {
      if (result.data) {
        toast.success("¡Cuenta creada! Por favor, inicia sesión.")
        navigate({
          to: "/onboarding",
        })
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
      }),
    onError: () => {
      toast.error("No se pudo registrar con Google. Inténtalo de nuevo.")
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
          toast.error(
            "La verificación de Turnstile fallida. Por favor, inténtalo de nuevo."
          )
        }
      },
      onError: () => {
        toast.error(
          "Ha ocurrido un error al verificar la verificación de Turnstile. Por favor, inténtalo de nuevo."
        )
      },
    })

  const onSubmit = handleSubmit((data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", { message: "Las contraseñas no coinciden." })
      return
    }
    const { confirmPassword: _, ...payload } = data
    mutate(payload)
  })

  const togglePassword = () => setShowPassword((prev) => !prev)
  const toggleConfirm = () => setShowConfirm((prev) => !prev)
  const handleGoogleSignIn = () => signInWithGoogle()

  const handleTurnstileSuccess = (token: string) => {
    verifyTurnstile(token)
  }

  const handleTurnstileError = () => {
    toast.error(
      "Ha ocurrido un error al verificar la verificación de Turnstile. Por favor, inténtalo de nuevo."
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Crea una cuenta
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Empieza a usar wappiz hoy. Es gratis.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  type="text"
                  placeholder="Escribe tu nombre"
                  autoComplete="name"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

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
                <FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>

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

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>

                <InputGroup>
                  <InputGroupInput
                    {...field}
                    id={field.name}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label={
                        showConfirm
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                      size="icon-xs"
                      onClick={toggleConfirm}
                    >
                      <HugeiconsIcon
                        icon={showConfirm ? ViewOffSlashIcon : EyeIcon}
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
          Crear cuenta
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
          aria-label="Registrarse con Google"
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
          ¿Ya tienes una cuenta?{" "}
          <Link
            to="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          Al crear una cuenta aceptás nuestra{" "}
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

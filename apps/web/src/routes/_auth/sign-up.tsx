import { arktypeResolver } from "@hookform/resolvers/arktype"
import { EyeIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

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
    handleSubmit,
    setError,
    formState: { errors },
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

  const onSubmit = handleSubmit((data) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", { message: "Las contraseñas no coinciden." })
      return
    }
    const { confirmPassword: _, ...payload } = data
    mutate(payload)
  })

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          Crea una cuenta
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Empieza a usar wappiz hoy. Es gratis.
        </p>
      </div>

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="Escribe tu nombre"
              autoComplete="name"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

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
                placeholder="Mín. 8 caracteres"
                autoComplete="new-password"
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
                onClick={() => setShowPassword((prev) => !prev)}
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

          <Field data-invalid={!!errors.confirmPassword}>
            <FieldLabel htmlFor="confirmPassword">
              Confirmar contraseña
            </FieldLabel>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                className="pr-9"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={
                  showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                onClick={() => setShowConfirm((prev) => !prev)}
              >
                <HugeiconsIcon
                  icon={showConfirm ? ViewOffSlashIcon : EyeIcon}
                  size={16}
                  strokeWidth={1.5}
                />
              </Button>
            </div>
            <FieldError errors={[errors.confirmPassword]} />
          </Field>
        </FieldGroup>

        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {isPending && <Spinner className="animate-spin" />}
          Crear cuenta
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Al crear una cuenta aceptás nuestra{" "}
          <Link to="/privacy" className="underline-offset-4 underline">
            política de privacidad
          </Link>
          .
        </p>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link
            to="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

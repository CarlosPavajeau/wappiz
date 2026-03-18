"use client"

import { arktypeResolver } from "@hookform/resolvers/arktype"
import { EyeIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { type } from "arktype"
import { isAxiosError } from "axios"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

const loginSchema = type({
  email: type("string.email").configure({
    message: "Ingresa un correo electrónico válido",
  }),
  password: type("string >= 1").configure({
    message: "La contraseña es requerida",
  }),
})

type LoginFormData = typeof loginSchema.infer

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: arktypeResolver(loginSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LoginFormData) =>
      authClient.signIn.email({
        email: data.email,
        password: data.password,
      }),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ??
          "Credenciales inválidas. Por favor, inténtalo de nuevo.")
        : "Algo salió mal. Por favor, inténtalo de nuevo."
      toast.error(message)
    },
    onSuccess: (result) => {
      if (result.data) {
        router.push("/dashboard")
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
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
        </FieldGroup>

        <Button type="submit" className="mt-2 w-full" disabled={isPending}>
          {isPending && <Spinner className="animate-spin" />}
          Iniciar sesión
        </Button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Crear una
          </Link>
        </p>
        <p className="text-xs text-muted-foreground">
          <Link
            href="/politica-de-privacidad"
            className="underline-offset-4 hover:underline"
          >
            Política de privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}

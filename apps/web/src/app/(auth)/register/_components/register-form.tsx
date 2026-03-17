"use client"

import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { type } from "arktype"
import { isAxiosError } from "axios"
import Cookies from "js-cookie"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

const registerSchema = type({
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

type RegisterFormData = typeof registerSchema.infer

export function RegisterForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: arktypeResolver(registerSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Omit<RegisterFormData, "confirmPassword">) =>
      api.auth.register(data),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ??
          "El registro falló. Por favor, inténtalo de nuevo.")
        : "Algo salió mal. Por favor, inténtalo de nuevo."
      toast.error(message)
    },
    onSuccess: (tokens) => {
      const { accessToken, refreshToken } = tokens

      Cookies.set("accessToken", accessToken, {
        secure: true,
      })
      Cookies.set("refreshToken", refreshToken, {
        secure: true,
      })

      toast.success("¡Cuenta creada! Por favor, inicia sesión.")
      router.push("/onboarding")
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Crea una cuenta</CardTitle>
        <CardDescription>Empieza a usar wappiz hoy</CardDescription>
      </CardHeader>

      <CardContent>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">Nombre de la barbería</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="Escribe el nombre de tu barbería"
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
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
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
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={
                    showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowConfirm((prev) => !prev)}
                >
                  {showConfirm ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <FieldError errors={[errors.confirmPassword]} />
            </Field>
          </FieldGroup>

          <Button type="submit" className="mt-1 w-full" disabled={isPending}>
            {isPending && <Spinner className="animate-spin" />}
            Crear cuenta
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Al crear una cuenta aceptás nuestra{" "}
            <Link
              href="/politica-de-privacidad"
              className="underline-offset-4 hover:underline"
            >
              Política de privacidad
            </Link>
            .
          </p>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

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
    mutationFn: (data: LoginFormData) => api.auth.login(data),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ??
          "Credenciales inválidas. Por favor, inténtalo de nuevo.")
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

      router.push("/dashboard")
    },
  })

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
        <CardDescription>Inicia sesión en tu cuenta de wappiz</CardDescription>
      </CardHeader>

      <CardContent>
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
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <FieldError errors={[errors.password]} />
            </Field>
          </FieldGroup>

          <Button type="submit" className="mt-1 w-full" disabled={isPending}>
            {isPending && <Spinner className="animate-spin" />}
            Iniciar sesión
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Crear una
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

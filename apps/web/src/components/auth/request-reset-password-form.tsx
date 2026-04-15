import { arktypeResolver } from "@hookform/resolvers/arktype"
import { useMutation } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { type } from "arktype"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"

import { Button } from "../ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field"
import { Input } from "../ui/input"
import { Spinner } from "../ui/spinner"

const schema = type({
  email: type("string.email").configure({
    message: "Ingresa un correo electrónico válido",
  }),
})

type FormValues = typeof schema.infer

export function RequestResetPasswordForm() {
  const [requestSent, setRequestSent] = useState(false)
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  })

  const { mutateAsync: requestPasswordReset } = useMutation({
    mutationFn: (data: FormValues) =>
      authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      }),
    onSuccess: (result) => {
      if (result.data?.status) {
        setRequestSent(true)
      } else if (result.error) {
        const message =
          result.error.message ??
          "Algo salió mal. Por favor, inténtalo de nuevo."
        toast.error(message)
      } else {
        toast.error("Ha ocurrido un error al reestablecer la contraseña")
      }
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = handleSubmit(async (data) => {
    await requestPasswordReset(data)
  })

  if (requestSent) {
    return (
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">
            Revisa tu correo
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Te enviamos un enlace para reestablecer tu contraseña. Si no
            aparece, revisa la carpeta de spam.
          </p>
        </div>

        <Button
          render={<Link to="/sign-in" />}
          nativeButton={false}
          variant="outline"
          className="w-full"
        >
          Volver al inicio de sesión
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Reestablecer contraseña
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresa tu correo para recibir un enlace de reestablecimiento.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
                  autoComplete="email"
                />

                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>

        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Reestablecer contraseña
        </Button>
      </form>
    </div>
  )
}

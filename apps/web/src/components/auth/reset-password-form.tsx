import { arktypeResolver } from "@hookform/resolvers/arktype"
import { EyeIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { type } from "arktype"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"

import { Button } from "../ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "../ui/input-group"
import { Spinner } from "../ui/spinner"

const resetPasswordSchema = type({
  token: "string",
  password: type("string >= 1").configure({
    message: "La contraseña es requerida",
  }),
  confirmPassword: type("string").configure({
    message: "La confirmación de contraseña es requerida",
  }),
})

type FormValues = typeof resetPasswordSchema.infer

type Props = {
  token: string
}

export function ResetPasswordForm({ token }: Props) {
  const navigate = useNavigate({
    from: "/",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: arktypeResolver(resetPasswordSchema),
    defaultValues: {
      token,
    },
  })

  const { mutateAsync: resetPassword } = useMutation({
    mutationFn: (data: FormValues) =>
      authClient.resetPassword({
        newPassword: data.password,
        token,
      }),
    onSuccess: (result) => {
      if (result.data) {
        toast.success("Contraseña reestablecida con éxito")
        navigate({
          to: "/sign-in",
        })
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
    await resetPassword(data)
  })

  const togglePassword = () => setShowPassword((prev) => !prev)
  const toggleConfirm = () => setShowConfirm((prev) => !prev)

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Reestablecer contraseña
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresa tu nueva contraseña.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FieldGroup>
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    {...field}
                    type={showPassword ? "text" : "password"}
                    id={field.name}
                    placeholder="Mín. 8 caracteres"
                    autoComplete="new-password"
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
                <FieldLabel htmlFor={field.name}>
                  Confirmar contraseña
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    {...field}
                    type={showConfirm ? "text" : "password"}
                    id={field.name}
                    placeholder="Mín. 8 caracteres"
                    autoComplete="new-password"
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

        <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Reestablecer contraseña
        </Button>
      </form>
    </div>
  )
}

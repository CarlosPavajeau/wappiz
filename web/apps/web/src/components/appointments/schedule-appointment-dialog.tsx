import { arktypeResolver } from "@hookform/resolvers/arktype"
import { PlusSignIcon, Refresh03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@wappiz/api-client"
import type { Customer } from "@wappiz/api-client/types/customers"
import type { Resource } from "@wappiz/api-client/types/resources"
import type { Service } from "@wappiz/api-client/types/services"
import { type } from "arktype"
import { format } from "date-fns"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"

const scheduleAppointmentSchema = type({
  customerId: type("string >= 1").configure({
    message: "Selecciona un cliente",
  }),
  date: type("string >= 1").configure({
    message: "Selecciona una fecha",
  }),
  resourceId: type("string >= 1").configure({
    message: "Selecciona un recurso",
  }),
  serviceId: type("string >= 1").configure({
    message: "Selecciona un servicio",
  }),
  time: type("string >= 1").configure({
    message: "Selecciona una hora",
  }),
})

type ScheduleAppointmentFormValues = typeof scheduleAppointmentSchema.infer

type Props = {
  defaultDate: Date
  isLoadingResources: boolean
  isLoadingServices: boolean
  resources: Resource[] | undefined
  services: Service[] | undefined
}

export function ScheduleAppointmentDialog({
  defaultDate,
  isLoadingResources,
  isLoadingServices,
  resources,
  services,
}: Props) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    data: customers,
    isError: isCustomersError,
    isFetching: isFetchingCustomers,
    isLoading: isLoadingCustomers,
    refetch: refetchCustomers,
  } = useQuery({
    enabled: open,
    queryFn: () => api.customers.list(),
    queryKey: ["customers"],
    staleTime: 5 * 60 * 1000,
  })
  const customersLoaded = customers !== undefined && !isCustomersError

  const { control, handleSubmit, reset } =
    useForm<ScheduleAppointmentFormValues>({
      defaultValues: defaultValuesFor(defaultDate),
      resolver: arktypeResolver(scheduleAppointmentSchema),
    })

  const {
    error: createAppointmentError,
    isPending: isCreatingAppointment,
    mutate: createAppointment,
    reset: resetCreateAppointment,
  } = useMutation({
    mutationFn: (values: ScheduleAppointmentFormValues) => {
      const startsAt = new Date(`${values.date}T${values.time}:00`)
      if (!Number.isFinite(startsAt.getTime())) {
        throw new TypeError("invalid appointment date")
      }

      return api.appointments.create({
        customerId: values.customerId,
        resourceId: values.resourceId,
        serviceId: values.serviceId,
        startsAt: startsAt.toISOString(),
      })
    },
    onSuccess: () => {
      setOpen(false)
      toast.success("Cita creada correctamente")
      queryClient.invalidateQueries({ queryKey: ["appointments"] })
      reset(defaultValuesFor(defaultDate))
    },
  })

  const onSubmit = handleSubmit((values) => createAppointment(values))

  const handleOpenChange = (next: boolean) => {
    reset(defaultValuesFor(defaultDate))
    resetCreateAppointment()
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            aria-label="Nueva cita"
            size="sm"
            className="max-sm:w-7 max-sm:px-0!"
          />
        }
      >
        <HugeiconsIcon
          icon={PlusSignIcon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        <span className="max-sm:hidden">Nueva cita</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Agendar cita</DialogTitle>
          <DialogDescription>
            Crea una cita confirmada para un cliente existente.
          </DialogDescription>
        </DialogHeader>

        <form id="schedule-appointment-form" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Controller
              control={control}
              name="customerId"
              render={({ field, fieldState }) => {
                const selectedCustomer = (customers ?? []).find(
                  (customer: Customer) => customer.id === field.value
                )

                return (
                  <Field data-invalid={fieldState.invalid || isCustomersError}>
                    <FieldLabel>Cliente</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={fieldState.invalid || isCustomersError}
                        disabled={isLoadingCustomers || isCustomersError}
                      >
                        <SelectValue>
                          {selectedCustomer?.displayName ??
                            "Selecciona un cliente"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(customers ?? []).map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                    {isLoadingCustomers && (
                      <p className="text-xs text-muted-foreground">
                        Cargando clientes...
                      </p>
                    )}
                    {isCustomersError && (
                      <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2">
                        <p className="text-xs text-destructive">
                          No se pudieron cargar los clientes.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isFetchingCustomers}
                          onClick={() => refetchCustomers()}
                        >
                          {isFetchingCustomers ? (
                            <Spinner />
                          ) : (
                            <HugeiconsIcon
                              icon={Refresh03Icon}
                              strokeWidth={2}
                              data-icon="inline-start"
                            />
                          )}
                          Reintentar
                        </Button>
                      </div>
                    )}
                  </Field>
                )
              }}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="serviceId"
                render={({ field, fieldState }) => {
                  const selectedService = (services ?? []).find(
                    (service: Service) => service.id === field.value
                  )

                  return (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Servicio</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                          disabled={isLoadingServices}
                        >
                          <SelectValue>
                            {selectedService?.name ?? "Servicio"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(services ?? []).map((service: Service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )
                }}
              />

              <Controller
                control={control}
                name="resourceId"
                render={({ field, fieldState }) => {
                  const selectedResource = (resources ?? []).find(
                    (resource: Resource) => resource.id === field.value
                  )

                  return (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Recurso</FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                          disabled={isLoadingResources}
                        >
                          <SelectValue>
                            {selectedResource?.name ?? "Recurso"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(resources ?? []).map((resource: Resource) => (
                            <SelectItem key={resource.id} value={resource.id}>
                              {resource.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="date"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Fecha</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="date"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="time"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Hora</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type="time"
                      step="300"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </form>

        {createAppointmentError !== null && (
          <div
            role="alert"
            className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2"
          >
            <p className="text-xs text-destructive">
              {createAppointmentError instanceof ApiError
                ? createAppointmentError.message
                : "No se pudo crear la cita. Revisa el horario e intenta de nuevo."}
            </p>
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button
            type="submit"
            form="schedule-appointment-form"
            disabled={isCreatingAppointment || !customersLoaded}
          >
            {isCreatingAppointment && <Spinner />}
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function defaultValuesFor(date: Date): ScheduleAppointmentFormValues {
  return {
    customerId: "",
    date: format(date, "yyyy-MM-dd"),
    resourceId: "",
    serviceId: "",
    time: "09:00",
  }
}

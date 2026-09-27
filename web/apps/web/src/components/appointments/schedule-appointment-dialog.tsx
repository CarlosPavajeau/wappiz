import { arktypeResolver } from "@hookform/resolvers/arktype"
import {
  Alert02Icon,
  PlusSignIcon,
  Refresh03Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { ApiError } from "@wappiz/api-client"
import type { Customer } from "@wappiz/api-client/types/customers"
import type { Resource } from "@wappiz/api-client/types/resources"
import type { Service } from "@wappiz/api-client/types/services"
import { type } from "arktype"
import { format } from "date-fns"
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
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
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/client-api"
import { formatPhoneNumber } from "@/lib/intl"
import { listResourceServicesQuery } from "@/queries/resources"

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

  const { control, handleSubmit, reset, setValue } =
    useForm<ScheduleAppointmentFormValues>({
      defaultValues: defaultValuesFor(defaultDate),
      resolver: arktypeResolver(scheduleAppointmentSchema),
    })

  // The API only rejects a resource/service pair on submit, so load which
  // services each resource offers up front and narrow both lists as the
  // user picks. Resources per tenant are few, so one request each is fine.
  const {
    isError: isLinksError,
    isLoading: isLoadingLinks,
    serviceIdsByResource,
  } = useQueries({
    combine: combineResourceServiceLinks,
    queries: (resources ?? []).map((resource) => ({
      ...listResourceServicesQuery(resource.id),
      enabled: open,
      select: (linked: Service[]): ResourceServiceLink => ({
        resourceId: resource.id,
        serviceIds: linked.map((service) => service.id),
      }),
      staleTime: 5 * 60 * 1000,
    })),
  })
  const linksReady = !(isLoadingLinks || isLinksError)

  const selectedResourceId = useWatch({ control, name: "resourceId" })
  const selectedServiceId = useWatch({ control, name: "serviceId" })

  const resourceOffers = (resourceId: string, serviceId: string) =>
    serviceIdsByResource.get(resourceId)?.has(serviceId) ?? false

  const availableServices =
    linksReady && selectedResourceId !== ""
      ? (services ?? []).filter((service) =>
          resourceOffers(selectedResourceId, service.id)
        )
      : (services ?? [])
  // A resource with no services can never be booked, so hide it outright.
  const availableResources = linksReady
    ? (resources ?? []).filter((resource) =>
        selectedServiceId === ""
          ? (serviceIdsByResource.get(resource.id)?.size ?? 0) > 0
          : resourceOffers(resource.id, selectedServiceId)
      )
    : (resources ?? [])

  const selectService = (serviceId: string) => {
    setValue("serviceId", serviceId, { shouldValidate: serviceId !== "" })
    if (
      linksReady &&
      serviceId !== "" &&
      selectedResourceId !== "" &&
      !resourceOffers(selectedResourceId, serviceId)
    ) {
      setValue("resourceId", "")
    }
  }

  const selectResource = (resourceId: string) => {
    setValue("resourceId", resourceId, { shouldValidate: resourceId !== "" })
    if (
      linksReady &&
      resourceId !== "" &&
      selectedServiceId !== "" &&
      !resourceOffers(resourceId, selectedServiceId)
    ) {
      setValue("serviceId", "")
    }
  }

  // Links and lists refetch while the dialog is open (focus, invalidation),
  // so a pair picked earlier can stop being valid. The pickers would then
  // look empty while the form still submits the old ids, which the API
  // rejects. Drop whichever side the latest data no longer supports.
  useEffect(() => {
    const next = reconcileSelection(
      { resourceId: selectedResourceId, serviceId: selectedServiceId },
      { linksReady, resources, serviceIdsByResource, services }
    )
    if (next.serviceId !== selectedServiceId) {
      setValue("serviceId", next.serviceId)
    }
    if (next.resourceId !== selectedResourceId) {
      setValue("resourceId", next.resourceId)
    }
  }, [
    linksReady,
    resources,
    selectedResourceId,
    selectedServiceId,
    serviceIdsByResource,
    services,
    setValue,
  ])

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
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || isCustomersError}>
                  <FieldLabel>Cliente</FieldLabel>
                  <SearchableCombobox
                    disabled={isLoadingCustomers || isCustomersError}
                    emptyText="No se encontraron clientes"
                    invalid={fieldState.invalid || isCustomersError}
                    items={customers ?? []}
                    labelOf={(customer) => customer.displayName}
                    matches={matchesCustomer}
                    onChange={field.onChange}
                    placeholder="Buscar por nombre o teléfono"
                    renderItem={(customer) => (
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{customer.displayName}</span>
                        {customer.displayName !== customer.phoneNumber && (
                          <span className="truncate text-xs text-muted-foreground">
                            {formatPhoneNumber(customer.phoneNumber)}
                          </span>
                        )}
                      </span>
                    )}
                    value={field.value}
                  />
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
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="serviceId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Servicio</FieldLabel>
                    <SearchableCombobox
                      disabled={isLoadingServices || isLoadingLinks}
                      emptyText={
                        selectedResourceId === ""
                          ? "No se encontraron servicios"
                          : "El recurso no presta servicios que coincidan"
                      }
                      invalid={fieldState.invalid}
                      items={availableServices}
                      labelOf={(service) => service.name}
                      matches={matchesName}
                      onChange={selectService}
                      placeholder="Buscar servicio"
                      value={field.value}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={control}
                name="resourceId"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Recurso</FieldLabel>
                    <SearchableCombobox
                      disabled={isLoadingResources || isLoadingLinks}
                      emptyText={resourcesEmptyText(
                        selectedServiceId,
                        availableResources.length
                      )}
                      invalid={fieldState.invalid}
                      items={availableResources}
                      labelOf={(resource) => resource.name}
                      matches={matchesName}
                      onChange={selectResource}
                      placeholder="Buscar recurso"
                      value={field.value}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
            {isLinksError && (
              <p className="text-xs text-muted-foreground">
                No se pudo verificar qué servicios presta cada recurso. La
                combinación se validará al agendar.
              </p>
            )}

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
          <Alert variant="destructive">
            <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} />
            <AlertTitle>No se pudo crear la cita</AlertTitle>
            <AlertDescription>
              {createAppointmentError instanceof ApiError
                ? createAppointmentError.message
                : "Revisa el horario e intenta de nuevo."}
            </AlertDescription>
          </Alert>
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

function resourcesEmptyText(
  selectedServiceId: string,
  eligibleCount: number
): string {
  if (eligibleCount > 0) {
    return "No se encontraron recursos"
  }
  return selectedServiceId === ""
    ? "No hay recursos con servicios asignados"
    : "Ningún recurso presta este servicio"
}

type Selection = {
  resourceId: string
  serviceId: string
}

type SelectionData = {
  linksReady: boolean
  resources: Resource[] | undefined
  serviceIdsByResource: Map<string, Set<string>>
  services: Service[] | undefined
}

/**
 * Returns the selection with any side the current data no longer supports
 * cleared. An undefined list means "unknown", not "empty", so it is left
 * alone. An incompatible pair keeps the resource and drops the service,
 * matching what `selectResource` does when the user picks by hand.
 */
function reconcileSelection(
  selection: Selection,
  { linksReady, resources, serviceIdsByResource, services }: SelectionData
): Selection {
  let { resourceId, serviceId } = selection
  if (
    serviceId !== "" &&
    services !== undefined &&
    !services.some((service) => service.id === serviceId)
  ) {
    serviceId = ""
  }
  if (
    resourceId !== "" &&
    resources !== undefined &&
    !resources.some((resource) => resource.id === resourceId)
  ) {
    resourceId = ""
  }
  if (!linksReady || resourceId === "") {
    return { resourceId, serviceId }
  }
  const offered = serviceIdsByResource.get(resourceId)
  if (serviceId !== "" && !(offered?.has(serviceId) ?? false)) {
    serviceId = ""
  }
  if ((offered?.size ?? 0) === 0) {
    resourceId = ""
  }
  return { resourceId, serviceId }
}

type ResourceServiceLink = {
  resourceId: string
  serviceIds: string[]
}

function combineResourceServiceLinks(
  results: {
    data: ResourceServiceLink | undefined
    isError: boolean
    isLoading: boolean
  }[]
) {
  return {
    isError: results.some((result) => result.isError),
    isLoading: results.some((result) => result.isLoading),
    serviceIdsByResource: new Map(
      results.flatMap((result) =>
        result.data === undefined
          ? []
          : [[result.data.resourceId, new Set(result.data.serviceIds)] as const]
      )
    ),
  }
}

type SearchableComboboxProps<T extends { id: string }> = {
  disabled: boolean
  emptyText: string
  invalid: boolean
  items: T[]
  labelOf: (item: T) => string
  matches: (item: T, query: string) => boolean
  onChange: (id: string) => void
  placeholder: string
  renderItem?: (item: T) => ReactNode
  value: string
}

/**
 * Single-select combobox that filters a preloaded list on the client. The
 * form only stores the entity id, so the selected object is derived from
 * `items` on every render and cleared selections map back to an empty id.
 */
function SearchableCombobox<T extends { id: string }>({
  disabled,
  emptyText,
  invalid,
  items,
  labelOf,
  matches,
  onChange,
  placeholder,
  renderItem,
  value,
}: SearchableComboboxProps<T>) {
  const selected = items.find((item) => item.id === value) ?? null

  return (
    <Combobox
      disabled={disabled}
      filter={(item: T, query: string) => matches(item, query)}
      isItemEqualToValue={(a, b) => a.id === b.id}
      items={items}
      itemToStringLabel={labelOf}
      itemToStringValue={(item) => item.id}
      onValueChange={(item) => onChange(item?.id ?? "")}
      value={selected}
    >
      <ComboboxInput
        aria-invalid={invalid}
        className="w-full"
        disabled={disabled}
        placeholder={placeholder}
        showClear={selected !== null}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={item.id} value={item}>
              {renderItem ? renderItem(item) : labelOf(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

function matchesCustomer(customer: Customer, query: string): boolean {
  const text = normalizeText(query)
  if (text === "") {
    return true
  }
  if (
    normalizeText(customer.displayName).includes(text) ||
    (customer.name !== null && normalizeText(customer.name).includes(text))
  ) {
    return true
  }
  const digits = digitsOf(query)
  return digits !== "" && digitsOf(customer.phoneNumber).includes(digits)
}

function matchesName(item: { name: string }, query: string): boolean {
  return normalizeText(item.name).includes(normalizeText(query))
}

/** Case- and accent-insensitive comparison key ("Jose" matches "José"). */
function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/[̀-ͯ]/gu, "")
    .toLowerCase()
    .trim()
}

/** Keeps only digits so "+57 300-123" matches "573001230000". */
function digitsOf(value: string): string {
  return value.replaceAll(/\D/gu, "")
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

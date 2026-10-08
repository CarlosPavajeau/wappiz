import { arktypeResolver } from "@hookform/resolvers/arktype"
import {
  ListSettingIcon,
  PencilEdit01Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import type {
  FlowFieldRule,
  TenantFlowField,
  UpsertTenantFlowFieldRequest,
} from "@wappiz/api-client/types/tenant-flow-fields"
import { type } from "arktype"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { Control } from "react-hook-form"
import { toast } from "sonner"

import {
  DEFAULT_TEXT_MAX_LENGTH,
  defaultRuleFor,
  describeRule,
  FLOW_FIELD_TYPE_DESCRIPTIONS,
  FLOW_FIELD_TYPE_LABELS,
  FLOW_FIELD_TYPES,
  isFlowFieldType,
  MAX_NUMBER_LIMIT,
  MAX_QUESTION_LENGTH,
  MAX_TEXT_LENGTH,
  MIN_NUMBER_LIMIT,
} from "@/components/flow-fields/flow-field-rules"
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

export const Route = createFileRoute("/_authed/dashboard/flow-fields")({
  component: RouteComponent,
  loader: async () => {
    const fields = await api.tenantFlowFields.list()
    return {
      fields: [...fields].toSorted(
        (left, right) => left.sortOrder - right.sortOrder
      ),
    }
  },
  pendingComponent: PendingComponent,
})

// The form holds every type's limits as flat fields because react-hook-form
// works best with a fixed shape; toRule() keeps only the selected type's.
const flowFieldSchema = type({
  fieldType: type.enumerated(...FLOW_FIELD_TYPES),
  isOneTime: "boolean",
  isRequired: "boolean",
  numberMax: "number.integer | null",
  numberMin: "number.integer | null",
  question: type(`2 <= string <= ${MAX_QUESTION_LENGTH}`).configure({
    message: `La pregunta debe tener entre 2 y ${MAX_QUESTION_LENGTH} caracteres`,
  }),
  sortOrder: type("number.integer >= 0").configure({
    message: "El orden debe ser un numero entero de 0 o mayor",
  }),
  textMaxLength: type(`1 <= number.integer <= ${MAX_TEXT_LENGTH}`).configure({
    message: `El máximo debe ser un entero entre 1 y ${MAX_TEXT_LENGTH}`,
  }),
  textMinLength: type(`0 <= number.integer <= ${MAX_TEXT_LENGTH}`).configure({
    message: `El mínimo debe ser un entero entre 0 y ${MAX_TEXT_LENGTH}`,
  }),
}).narrow((data, ctx) => {
  if (data.fieldType === "text" && data.textMinLength > data.textMaxLength) {
    return ctx.reject({
      message: "El mínimo no puede ser mayor que el máximo",
      path: ["textMinLength"],
    })
  }
  // A union ignores `.configure()`, so the integer range of the optional
  // number bounds is checked here with its own message.
  const outOfRange = (["numberMin", "numberMax"] as const).find((key) => {
    const value = data[key]
    return (
      data.fieldType === "number" &&
      value !== null &&
      (value < MIN_NUMBER_LIMIT || value > MAX_NUMBER_LIMIT)
    )
  })
  if (outOfRange !== undefined) {
    return ctx.reject({
      message: `Usa un número entre ${MIN_NUMBER_LIMIT.toLocaleString("es-CO")} y ${MAX_NUMBER_LIMIT.toLocaleString("es-CO")}`,
      path: [outOfRange],
    })
  }
  if (
    data.fieldType === "number" &&
    data.numberMin !== null &&
    data.numberMax !== null &&
    data.numberMin > data.numberMax
  ) {
    return ctx.reject({
      message: "El mínimo no puede ser mayor que el máximo",
      path: ["numberMin"],
    })
  }
  return true
})

type FlowFieldFormValues = typeof flowFieldSchema.infer

type RuleFormValues = Pick<
  FlowFieldFormValues,
  "fieldType" | "numberMax" | "numberMin" | "textMaxLength" | "textMinLength"
>

type FieldTemplate = {
  label: string
  description: string
  question: string
  rule: FlowFieldRule
  isOneTime: boolean
  isRequired: boolean
}

// Starting points offered when creating a field; picking one only pre-fills
// the form. Data that rarely changes is asked once per customer by default.
const FIELD_TEMPLATES: FieldTemplate[] = [
  {
    description: "Cédula u otro documento del cliente",
    isOneTime: true,
    isRequired: true,
    label: "Documento de identidad",
    question: "¿Cuál es tu número de documento?",
    rule: { type: "document" },
  },
  {
    description: "Por qué el cliente agenda la cita",
    isOneTime: false,
    isRequired: false,
    label: "Motivo de la visita",
    question: "¿Cuál es el motivo de tu visita?",
    rule: { maxLength: 280, minLength: 3, type: "text" },
  },
  {
    description: "Correo de contacto del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Correo electrónico",
    question: "¿Cuál es tu correo electrónico?",
    rule: { type: "email" },
  },
  {
    description: "Otro número de contacto del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Celular alterno",
    question: "¿Tienes otro número de celular donde podamos contactarte?",
    rule: { type: "phone" },
  },
  {
    description: "Dirección de residencia del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Dirección",
    question: "¿Cuál es tu dirección?",
    rule: { maxLength: 200, minLength: 5, type: "text" },
  },
  {
    description: "Fecha de nacimiento del cliente",
    isOneTime: true,
    isRequired: false,
    label: "Fecha de nacimiento",
    question: "¿Cuál es tu fecha de nacimiento?",
    rule: { type: "date" },
  },
]

type FlowFieldDialogProps = {
  field?: TenantFlowField
}

// Limits of the types not selected are reset to their defaults, so a hidden
// input can never hold a value that blocks submitting.
function ruleFormValues(rule: FlowFieldRule): RuleFormValues {
  const values: RuleFormValues = {
    fieldType: rule.type,
    numberMax: null,
    numberMin: null,
    textMaxLength: DEFAULT_TEXT_MAX_LENGTH,
    textMinLength: 0,
  }
  if (rule.type === "text") {
    return {
      ...values,
      textMaxLength: rule.maxLength,
      textMinLength: rule.minLength,
    }
  }
  if (rule.type === "number") {
    return {
      ...values,
      numberMax: rule.maxValue ?? null,
      numberMin: rule.minValue ?? null,
    }
  }
  return values
}

function defaultValuesFor(
  field: TenantFlowField | undefined
): FlowFieldFormValues {
  return {
    ...ruleFormValues(field?.rule ?? defaultRuleFor("text")),
    isOneTime: field?.isOneTime ?? false,
    isRequired: field?.isRequired ?? false,
    question: field?.question ?? "",
    sortOrder: field?.sortOrder ?? 0,
  }
}

function toRule(values: RuleFormValues): FlowFieldRule {
  if (values.fieldType === "text") {
    return {
      maxLength: values.textMaxLength,
      minLength: values.textMinLength,
      type: "text",
    }
  }
  if (values.fieldType === "number") {
    return {
      type: "number",
      ...(values.numberMin === null ? {} : { minValue: values.numberMin }),
      ...(values.numberMax === null ? {} : { maxValue: values.numberMax }),
    }
  }
  return { type: values.fieldType }
}

function toRequest(values: FlowFieldFormValues): UpsertTenantFlowFieldRequest {
  return {
    isOneTime: values.isOneTime,
    isRequired: values.isRequired,
    question: values.question.trim(),
    rule: toRule(values),
    sortOrder: values.sortOrder,
  }
}

// An empty optional bound means "no limit". An empty required bound is kept
// as "" so the schema reports it instead of silently turning it into 0.
function parseBoundInput(value: string, optional: boolean): number | "" | null {
  if (value === "") {
    return optional ? null : ""
  }
  return Number(value)
}

function FlowFieldDialog({ field }: FlowFieldDialogProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isEdit = field !== undefined
  const formId = isEdit ? `update-flow-field-${field.id}` : "create-flow-field"

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<FlowFieldFormValues>({
    defaultValues: defaultValuesFor(field),
    resolver: arktypeResolver(flowFieldSchema),
  })
  const fieldType = useWatch({ control, name: "fieldType" })
  const questionLength = useWatch({ control, name: "question" }).length

  const applyRule = (rule: FlowFieldRule) => {
    const values = ruleFormValues(rule)
    setValue("fieldType", values.fieldType, { shouldDirty: true })
    setValue("textMinLength", values.textMinLength, { shouldDirty: true })
    setValue("textMaxLength", values.textMaxLength, { shouldDirty: true })
    setValue("numberMin", values.numberMin, { shouldDirty: true })
    setValue("numberMax", values.numberMax, { shouldDirty: true })
  }

  const { mutateAsync: saveField } = useMutation({
    mutationFn: async (values: FlowFieldFormValues) => {
      const request = toRequest(values)
      if (field === undefined) {
        await api.tenantFlowFields.create(request)
        return
      }
      await api.tenantFlowFields.update(field.id, request)
    },
    onError: () => {
      toast.error(
        "No se pudo guardar el campo. Revisa los datos e intenta de nuevo."
      )
    },
    onSuccess: () => {
      setOpen(false)
      reset(defaultValuesFor(field))
      toast.success(isEdit ? "Campo actualizado" : "Campo creado")
      router.invalidate()
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const submittedQuestion = values.question.trim()
    if (submittedQuestion.length < 2) {
      toast.error("La pregunta debe tener al menos 2 caracteres.")
      return
    }
    await saveField({ ...values, question: submittedQuestion })
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(defaultValuesFor(field))
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            size={isEdit ? "icon-sm" : "default"}
            variant={isEdit ? "ghost" : "default"}
          />
        }
      >
        {isEdit ? (
          <>
            <HugeiconsIcon
              icon={PencilEdit01Icon}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="sr-only">Editar campo</span>
          </>
        ) : (
          <>
            <HugeiconsIcon
              icon={PlusSignIcon}
              strokeWidth={2}
              data-icon="inline-start"
              aria-hidden="true"
            />
            Nuevo campo
          </>
        )}
      </DialogTrigger>

      <DialogContent className="gap-5 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar campo del flujo" : "Nuevo campo del flujo"}
          </DialogTitle>
          <DialogDescription>
            Controla que dato pide el bot, cuando lo pide y si puede continuar
            sin respuesta.
          </DialogDescription>
        </DialogHeader>

        <form id={formId} onSubmit={onSubmit}>
          <FieldGroup>
            {!isEdit && (
              <Field>
                <FieldLabel>Plantillas</FieldLabel>
                <FieldDescription>
                  Elige una para llenar el formulario y ajústalo si quieres.
                </FieldDescription>
                <div className="flex flex-wrap gap-2">
                  {FIELD_TEMPLATES.map((template) => (
                    <Button
                      key={template.label}
                      type="button"
                      size="xs"
                      variant="outline"
                      title={template.description}
                      onClick={() => {
                        setValue("question", template.question, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                        setValue("isOneTime", template.isOneTime, {
                          shouldDirty: true,
                        })
                        setValue("isRequired", template.isRequired, {
                          shouldDirty: true,
                        })
                        applyRule(template.rule)
                      }}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </Field>
            )}

            <Controller
              control={control}
              name="question"
              render={({ field: formField, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formField.name}>Pregunta</FieldLabel>
                  <FieldDescription>
                    Escribe la pregunta tal como la recibira el cliente en
                    WhatsApp. El bot le agrega una pista del formato esperado.
                  </FieldDescription>
                  <Textarea
                    {...formField}
                    id={formField.name}
                    placeholder="¿Cuál es tu correo electrónico?"
                    className="min-h-24 resize-none"
                    maxLength={MAX_QUESTION_LENGTH}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={`${formField.name}-count`}
                  />
                  <p
                    id={`${formField.name}-count`}
                    className="text-right text-xs text-muted-foreground tabular-nums"
                  >
                    {questionLength}/{MAX_QUESTION_LENGTH}
                  </p>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="fieldType"
              render={({ field: formField, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formField.name}>
                    Tipo de respuesta
                  </FieldLabel>
                  <Select
                    value={formField.value}
                    onValueChange={(value) => {
                      if (isFlowFieldType(value)) {
                        applyRule(defaultRuleFor(value))
                      }
                    }}
                  >
                    <SelectTrigger
                      id={formField.name}
                      className="w-full"
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue>
                        {FLOW_FIELD_TYPE_LABELS[formField.value]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {FLOW_FIELD_TYPES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {FLOW_FIELD_TYPE_LABELS[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {FLOW_FIELD_TYPE_DESCRIPTIONS[formField.value]} Si la
                    respuesta no es válida, el bot explica el error y vuelve a
                    preguntar hasta 3 veces.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {fieldType === "text" && (
              <RangeFields
                control={control}
                legend="Longitud de la respuesta (caracteres)"
                minName="textMinLength"
                maxName="textMaxLength"
                min={0}
                max={MAX_TEXT_LENGTH}
                optional={false}
              />
            )}

            {fieldType === "number" && (
              <RangeFields
                control={control}
                legend="Rango permitido (opcional)"
                minName="numberMin"
                maxName="numberMax"
                min={MIN_NUMBER_LIMIT}
                max={MAX_NUMBER_LIMIT}
                optional
              />
            )}

            <Controller
              control={control}
              name="sortOrder"
              render={({ field: formField, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formField.name}>Orden</FieldLabel>
                  <FieldDescription>
                    Los numeros menores se preguntan primero.
                  </FieldDescription>
                  <Input
                    {...formField}
                    id={formField.name}
                    type="number"
                    min={0}
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => {
                      const { value } = event.target
                      formField.onChange(value === "" ? "" : Number(value))
                    }}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="isRequired"
              render={({ field: formField, fieldState }) => (
                <Field
                  orientation="horizontal"
                  className="rounded-lg border bg-muted/20 p-3"
                  data-invalid={fieldState.invalid}
                >
                  <FieldContent>
                    <FieldLabel htmlFor={formField.name}>
                      Respuesta obligatoria
                    </FieldLabel>
                    <FieldDescription>
                      El flujo espera este dato antes de confirmar la cita.
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </FieldContent>
                  <Switch
                    id={formField.name}
                    name={formField.name}
                    aria-invalid={fieldState.invalid}
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                  />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="isOneTime"
              render={({ field: formField, fieldState }) => (
                <Field
                  orientation="horizontal"
                  className="rounded-lg border bg-muted/20 p-3"
                  data-invalid={fieldState.invalid}
                >
                  <FieldContent>
                    <FieldLabel htmlFor={formField.name}>
                      Pedir solo una vez
                    </FieldLabel>
                    <FieldDescription>
                      Si el cliente ya respondio, no se repite en futuras
                      reservas.
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </FieldContent>
                  <Switch
                    id={formField.name}
                    name={formField.name}
                    aria-invalid={fieldState.invalid}
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                  />
                </Field>
              )}
            />
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {isEdit ? "Guardar cambios" : "Crear campo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type RangeFieldsProps = {
  control: Control<FlowFieldFormValues>
  legend: string
  min: number
  max: number
} & (
  | { optional: false; minName: "textMinLength"; maxName: "textMaxLength" }
  | { optional: true; minName: "numberMin"; maxName: "numberMax" }
)

function RangeFields({
  control,
  legend,
  min,
  max,
  optional,
  minName,
  maxName,
}: RangeFieldsProps) {
  const bounds = [
    { label: "Mínimo", name: minName },
    { label: "Máximo", name: maxName },
  ]

  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="grid grid-cols-2 gap-3">
        {bounds.map((bound) => (
          <Controller
            key={bound.name}
            control={control}
            name={bound.name}
            render={({ field: formField, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formField.name}>{bound.label}</FieldLabel>
                <Input
                  {...formField}
                  id={formField.name}
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={min}
                  max={max}
                  placeholder={optional ? "Sin límite" : undefined}
                  value={formField.value ?? ""}
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => {
                    const { value } = event.target
                    formField.onChange(parseBoundInput(value, optional))
                  }}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}
      </div>
    </FieldSet>
  )
}

function FlowFieldEnabledSwitch({ field }: { field: TenantFlowField }) {
  const router = useRouter()
  const { mutate: toggleField, isPending } = useMutation({
    mutationFn: () => api.tenantFlowFields.toggle(field.id),
    onError: () => {
      toast.error("No se pudo cambiar el estado del campo.")
    },
    onSuccess: () => {
      router.invalidate()
    },
  })

  return (
    <Switch
      checked={field.isEnabled}
      disabled={isPending}
      aria-label={field.isEnabled ? "Desactivar campo" : "Activar campo"}
      onCheckedChange={() => toggleField()}
    />
  )
}

function FlowFieldsTable({ fields }: { fields: TenantFlowField[] }) {
  return (
    <Table>
      <TableCaption className="sr-only">
        Campos del flujo de WhatsApp
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Pregunta</TableHead>
          <TableHead>Respuesta</TableHead>
          <TableHead>Orden</TableHead>
          <TableHead>Obligatorio</TableHead>
          <TableHead>Frecuencia</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.id}>
            <TableCell className="font-medium">{field.question}</TableCell>
            <TableCell className="text-muted-foreground">
              {describeRule(field.rule)}
            </TableCell>
            <TableCell className="text-muted-foreground tabular-nums">
              {field.sortOrder}
            </TableCell>
            <TableCell>{field.isRequired ? "Si" : "No"}</TableCell>
            <TableCell>{field.isOneTime ? "Una vez" : "Cada cita"}</TableCell>
            <TableCell>
              <FlowFieldEnabledSwitch field={field} />
            </TableCell>
            <TableCell>
              <FlowFieldDialog field={field} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RouteComponent() {
  const { fields } = Route.useLoaderData()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Campos del flujo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura los datos que el bot puede pedir antes de confirmar una
            cita.
          </p>
        </div>
        <FlowFieldDialog />
      </div>

      {fields.length === 0 ? (
        <Empty className="border py-20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon
                icon={ListSettingIcon}
                strokeWidth={2}
                aria-hidden="true"
              />
            </EmptyMedia>
            <EmptyTitle>Sin campos</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              Crea un campo para personalizar los datos que captura el flujo.
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <FlowFieldsTable fields={fields} />
      )}
    </div>
  )
}

function PendingComponent() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4 sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

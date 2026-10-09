import { arktypeResolver } from "@hookform/resolvers/arktype"
import { PencilEdit01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import type {
  FlowFieldRule,
  TenantFlowField,
} from "@wappiz/api-client/types/tenant-flow-fields"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import type { Control } from "react-hook-form"
import { toast } from "sonner"

import {
  defaultValuesFor,
  FIELD_TEMPLATES,
  flowFieldSchema,
  parseBoundInput,
  ruleFormValues,
  toRequest,
} from "@/components/flow-fields/flow-field-form"
import type { FlowFieldFormValues } from "@/components/flow-fields/flow-field-form"
import {
  defaultRuleFor,
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/client-api"

type FlowFieldSheetProps = {
  field?: TenantFlowField
}

export function FlowFieldSheet({ field }: FlowFieldSheetProps) {
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
    try {
      await saveField({ ...values, question: submittedQuestion })
    } catch {
      // onError already told the user; rethrowing would only leave an
      // unhandled rejection behind the form submit.
    }
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(defaultValuesFor(field))
    }
    setOpen(next)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
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
      </SheetTrigger>

      {/* The form is taller than most viewports, so only its body scrolls and
          the header and actions stay pinned. */}
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>
            {isEdit ? "Editar campo del flujo" : "Nuevo campo del flujo"}
          </SheetTitle>
          <SheetDescription>
            Controla que dato pide el bot, cuando lo pide y si puede continuar
            sin respuesta.
          </SheetDescription>
        </SheetHeader>

        <form
          id={formId}
          onSubmit={onSubmit}
          className="min-h-0 flex-1 overflow-y-auto p-4"
        >
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

        <SheetFooter className="flex-col-reverse border-t sm:flex-row sm:justify-end">
          <SheetClose render={<Button variant="outline" />}>
            Cancelar
          </SheetClose>
          <Button type="submit" form={formId} disabled={isSubmitting}>
            {isSubmitting && <Spinner />}
            {isEdit ? "Guardar cambios" : "Crear campo"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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

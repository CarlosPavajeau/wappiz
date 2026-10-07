import {
  Cancel01Icon,
  SmartPhone01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { CustomerStatus } from "@wappiz/api-client/types/customers"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Mirror the API limits so the inputs can never produce a rejected request.
const MAX_NAME_LENGTH = 255
const MAX_PHONE_LENGTH = 20

export const CUSTOMERS_PAGE_SIZE = 20

// The API stores page and offset as 32-bit integers and rejects anything
// larger; this is the last page whose offset still fits at our page size.
const MAX_INT32 = 2_147_483_647
const MAX_PAGE = Math.floor(MAX_INT32 / CUSTOMERS_PAGE_SIZE) + 1

const STATUS_FILTERS = ["all", "active", "blocked"] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_LABELS: Record<StatusFilter, string> = {
  active: "Activos",
  all: "Todos los estados",
  blocked: "Bloqueados",
}

/**
 * The customers list state as it lives in the URL, so it survives a trip to
 * a customer's detail page and can be shared. Absent keys mean "no filter".
 */
export type CustomerSearch = {
  name?: string
  phone?: string
  status?: CustomerStatus
  page?: number
}

const isStatus = (value: unknown): value is CustomerStatus =>
  value === "active" || value === "blocked"

const isStatusFilter = (value: unknown): value is StatusFilter =>
  STATUS_FILTERS.some((filter) => filter === value)

/** Blank text means "no filter"; overlong text is clamped to the API limit. */
function textFilter(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return
  }
  const trimmed = value.trim().slice(0, maxLength)
  return trimmed === "" ? undefined : trimmed
}

export const nameFilter = (value: unknown) => textFilter(value, MAX_NAME_LENGTH)

/** A phone filter without digits cannot match anything, so it is dropped. */
export const phoneFilter = (value: unknown) => {
  const text = textFilter(value, MAX_PHONE_LENGTH)
  return text !== undefined && /\d/u.test(text) ? text : undefined
}

/** Lenient on purpose: a hand-edited URL must never break the page. */
export function parseCustomerSearch(
  search: Record<string, unknown>
): CustomerSearch {
  const page = Number(search["page"])
  return {
    name: nameFilter(search["name"]),
    // Clamped, not dropped: a page past the end then lands on the last page
    // like any other overshoot, instead of a request the API rejects.
    page:
      Number.isInteger(page) && page > 1 ? Math.min(page, MAX_PAGE) : undefined,
    phone: phoneFilter(search["phone"]),
    status: isStatus(search["status"]) ? search["status"] : undefined,
  }
}

export const hasActiveFilters = (search: CustomerSearch) =>
  search.name !== undefined ||
  search.phone !== undefined ||
  search.status !== undefined

type SearchInputProps = {
  icon: typeof Search01Icon
  label: string
  inputMode: "search" | "tel"
  maxLength: number
  value: string
  onChange: (value: string) => void
}

function SearchInput({
  icon,
  label,
  inputMode,
  maxLength,
  value,
  onChange,
}: SearchInputProps) {
  return (
    <InputGroup className="h-9 sm:max-w-64">
      <InputGroupAddon>
        <HugeiconsIcon icon={icon} strokeWidth={2} aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        inputMode={inputMode}
        aria-label={label}
        placeholder={label}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value !== "" && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={`Limpiar ${label.toLowerCase()}`}
            onClick={() => onChange("")}
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              aria-hidden="true"
            />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

/** Raw text as typed; the route debounces it before it reaches the URL. */
export type CustomerSearchDraft = {
  name: string
  phone: string
}

type Props = {
  draft: CustomerSearchDraft
  status: CustomerStatus | undefined
  onDraftChange: (draft: CustomerSearchDraft) => void
  onStatusChange: (status: CustomerStatus | undefined) => void
}

export function CustomerFiltersBar({
  draft,
  status,
  onDraftChange,
  onStatusChange,
}: Props) {
  const statusFilter: StatusFilter = status ?? "all"

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <SearchInput
        icon={Search01Icon}
        label="Buscar por nombre"
        inputMode="search"
        maxLength={MAX_NAME_LENGTH}
        value={draft.name}
        onChange={(name) => onDraftChange({ ...draft, name })}
      />
      <SearchInput
        icon={SmartPhone01Icon}
        label="Buscar por teléfono"
        inputMode="tel"
        maxLength={MAX_PHONE_LENGTH}
        value={draft.phone}
        onChange={(phone) => onDraftChange({ ...draft, phone })}
      />
      <Select
        value={statusFilter}
        onValueChange={(value) => {
          if (isStatusFilter(value)) {
            onStatusChange(value === "all" ? undefined : value)
          }
        }}
      >
        <SelectTrigger
          aria-label="Filtrar por estado"
          className="h-9 w-full sm:w-44"
        >
          <SelectValue>{STATUS_LABELS[statusFilter]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTERS.map((filter) => (
            <SelectItem key={filter} value={filter}>
              {STATUS_LABELS[filter]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

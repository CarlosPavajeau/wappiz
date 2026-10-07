import { Refresh03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "@tanstack/react-query"
import type {
  Customer,
  ListCustomersParams,
} from "@wappiz/api-client/types/customers"
import { useState } from "react"

import {
  nameFilter,
  phoneFilter,
} from "@/components/customers/customer-filters"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Spinner } from "@/components/ui/spinner"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { formatPhoneNumber } from "@/lib/intl"
import { listCustomersQuery } from "@/queries/customers"

const SEARCH_DEBOUNCE_MS = 300
const RESULT_LIMIT = 20

/**
 * One box searches both fields: text with letters is a name, anything else
 * with digits is a phone fragment. Mixed input ("Ana 300") reads as a name,
 * which is what staff type when they know who they are looking for.
 */
function toSearchParams(text: string): ListCustomersParams {
  if (/\p{L}/u.test(text)) {
    return { limit: RESULT_LIMIT, name: nameFilter(text) }
  }
  return { limit: RESULT_LIMIT, phone: phoneFilter(text) }
}

type Props = {
  invalid: boolean
  onChange: (id: string) => void
  value: string
}

/**
 * Searches customers on the server as the user types; an empty box lists the
 * most recent ones. The picked customer is kept locally because it may not be
 * part of the latest results, and it is only shown while the form still holds
 * its id, so a form reset clears the box too.
 */
export function CustomerCombobox({ invalid, onChange, value }: Props) {
  const [inputValue, setInputValue] = useState("")
  const [picked, setPicked] = useState<Customer | null>(null)
  const selected = picked?.id === value ? picked : null

  const search = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS)
  const { data, isError, isFetching, refetch } = useQuery(
    listCustomersQuery(toSearchParams(search))
  )
  const searching = isFetching || search !== inputValue

  return (
    <>
      <Combobox
        filter={null}
        inputValue={inputValue}
        isItemEqualToValue={(a, b) => a.id === b.id}
        items={data?.customers ?? []}
        itemToStringLabel={(customer) => customer.displayName}
        itemToStringValue={(customer) => customer.id}
        onInputValueChange={setInputValue}
        onValueChange={(customer) => {
          setPicked(customer)
          onChange(customer?.id ?? "")
        }}
        value={selected}
      >
        <ComboboxInput
          aria-invalid={invalid || isError}
          className="w-full"
          placeholder="Buscar por nombre o teléfono"
          showClear={selected !== null}
        />
        <ComboboxContent>
          <ComboboxEmpty>
            {searching ? "Buscando clientes..." : "No se encontraron clientes"}
          </ComboboxEmpty>
          <ComboboxList>
            {(customer: Customer) => (
              <ComboboxItem key={customer.id} value={customer}>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{customer.displayName}</span>
                  {customer.displayName !== customer.phoneNumber && (
                    <span className="truncate text-xs text-muted-foreground">
                      {formatPhoneNumber(customer.phoneNumber)}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {isError && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2">
          <p className="text-xs text-destructive">
            No se pudieron cargar los clientes.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            {isFetching ? (
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
    </>
  )
}

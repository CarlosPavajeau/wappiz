import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { Customer } from "@wappiz/api-client/types/customers"
import { useState } from "react"

import { CustomerCombobox } from "@/components/appointments/customer-combobox"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type Props = {
  customerId: string | null
  /** The customer behind `customerId`, once loaded. */
  customer: Customer | undefined
  onCustomerIdChange: (id: string | null) => void
}

const PLACEHOLDER = "Buscar citas por cliente"

/** Inline customer picker for the desktop toolbar. */
export function CustomerSearchField({
  customerId,
  customer,
  onCustomerIdChange,
}: Props) {
  return (
    <div className="flex w-64 flex-col gap-2">
      <CustomerCombobox
        invalid={false}
        placeholder={PLACEHOLDER}
        selectedCustomer={customer}
        value={customerId ?? ""}
        onChange={(id) => onCustomerIdChange(id === "" ? null : id)}
      />
    </div>
  )
}

/**
 * The mobile toolbar has no room for an input, so the picker lives in a sheet
 * opened from the top, where the on-screen keyboard can't cover the results.
 */
export function CustomerSearchSheet({
  customerId,
  customer,
  onCustomerIdChange,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            aria-label="Buscar citas por cliente"
            size="icon-sm"
            variant="outline"
            className="md:hidden"
          />
        }
      >
        <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
      </SheetTrigger>
      <SheetContent side="top">
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle>Buscar cliente</SheetTitle>
          <SheetDescription>
            Muestra sus citas recientes y próximas.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-4">
          <CustomerCombobox
            autoFocus
            invalid={false}
            placeholder="Nombre o teléfono"
            selectedCustomer={customer}
            value={customerId ?? ""}
            onChange={(id) => {
              if (id !== "") {
                onCustomerIdChange(id)
                setOpen(false)
              }
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

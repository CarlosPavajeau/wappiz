"use client"

import { Calendar04Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  onChange: (date: Date) => void
  value: Date | undefined
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function DatePicker({
  onChange,
  value,
  disabled = false,
  placeholder = "Seleccionar fecha",
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button variant="outline" size="sm" />}
        className={cn(
          "w-44 justify-start gap-2 font-normal",
          !value && "text-muted-foreground",
          className
        )}
      >
        <HugeiconsIcon
          icon={Calendar04Icon}
          strokeWidth={2}
          data-icon="inline-start"
        />
        {value
          ? format(value, "MMM d, yyyy", {
              locale: es,
            })
          : placeholder}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          autoFocus
          mode="single"
          selected={value}
          onSelect={handleSelect}
          locale={es}
        />
      </PopoverContent>
    </Popover>
  )
}

import * as React from "react"
import { format, isValid, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  placeholder = "Pick a date",
  disabled,
  id,
  className,
}: DatePickerProps) {
  const selectedDate = value ? parseISO(value) : undefined
  const hasValidDate = selectedDate && isValid(selectedDate)

  return (
    <Popover onOpenChange={(open) => !open && onBlur?.()}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !hasValidDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {hasValidDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={hasValidDate ? selectedDate : undefined}
          onSelect={(date) => date && onChange(format(date, "yyyy-MM-dd"))}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  )
}

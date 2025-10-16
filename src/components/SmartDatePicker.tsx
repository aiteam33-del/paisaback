import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface SmartDatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
}

export const SmartDatePicker = ({ date, onDateChange }: SmartDatePickerProps) => {
  const quickOptions = [
    { label: "Today", getValue: () => new Date() },
    { label: "Yesterday", getValue: () => subDays(new Date(), 1) },
    { label: "Last Week", getValue: () => subDays(new Date(), 7) },
    { label: "Start of Week", getValue: () => startOfWeek(new Date()) },
    { label: "Start of Month", getValue: () => startOfMonth(new Date()) },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="border-b p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Quick Select</p>
          <div className="grid grid-cols-2 gap-2">
            {quickOptions.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                onClick={() => onDateChange(option.getValue())}
                className="justify-start"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => selectedDate && onDateChange(selectedDate)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
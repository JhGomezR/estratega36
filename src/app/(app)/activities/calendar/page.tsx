import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendario de Actividades</h1>
        <p className="text-muted-foreground">Organiza y visualiza los eventos de tu campaña.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Calendar
            mode="single"
            className="w-full p-0 [&_td]:p-1 [&_th]:p-2 [&_.day-range-end]:rounded-r-md [&_.day-range-start]:rounded-l-md [&_button]:h-12 [&_button]:w-full"
            classNames={{
              root: "w-full",
              months: "w-full",
              month: "w-full space-y-4",
              table: "w-full border-collapse",
              head_row: "flex justify-between border-b",
              head_cell: "w-full text-muted-foreground rounded-md font-normal text-[0.8rem] uppercase",
              row: "flex w-full mt-2 justify-between",
              cell: "h-24 w-full text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-full w-full p-1 font-normal aria-selected:opacity-100 justify-start items-start flex",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

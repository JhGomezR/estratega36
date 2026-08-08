"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

const ACTIONS = ["read", "create", "update", "delete"] as const
const ACTION_LABELS: Record<string, string> = { read: "Ver", create: "Crear", update: "Editar", delete: "Eliminar" }

/**
 * Matriz de permisos por módulo (Módulo · Todos · Ver/Crear/Editar/Eliminar).
 * Reutilizable para roles de tenant y de plataforma. `value` es la lista de
 * permisos `"modulo:accion"`; solo se muestran las acciones que cada módulo tiene.
 */
export function PermissionMatrix({
  groups,
  value,
  onChange,
  moduleLabels = {},
  moduleIcons = {},
  height = "h-72",
}: {
  groups: Record<string, readonly string[]>
  value: string[]
  onChange: (next: string[]) => void
  moduleLabels?: Record<string, string>
  moduleIcons?: Record<string, LucideIcon>
  height?: string
}) {
  const entries = Object.entries(groups)
  const all = entries.flatMap(([m, acts]) => acts.map((a) => `${m}:${a}`))
  const allChecked = all.length > 0 && all.every((p) => value.includes(p))
  const someChecked = value.length > 0 && !allChecked

  const toggle = (perm: string, on: boolean) =>
    onChange(on ? [...new Set([...value, perm])] : value.filter((p) => p !== perm))
  const toggleRow = (module: string, acts: readonly string[], on: boolean) => {
    const perms = acts.map((a) => `${module}:${a}`)
    onChange(on ? [...new Set([...value, ...perms])] : value.filter((p) => !perms.includes(p)))
  }
  const toggleAll = (on: boolean) => onChange(on ? [...all] : [])

  return (
    <ScrollArea className={`${height} w-full rounded-md border`}>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-[220px]">Módulo</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-2">
                <span>Todos</span>
                <Checkbox
                  checked={allChecked || (someChecked ? "indeterminate" : false)}
                  onCheckedChange={(c) => toggleAll(!!c)}
                />
              </div>
            </TableHead>
            {ACTIONS.map((a) => <TableHead key={a} className="text-center">{ACTION_LABELS[a]}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([module, acts]) => {
            const Icon = moduleIcons[module]
            const rowPerms = acts.map((a) => `${module}:${a}`)
            const rowAll = rowPerms.every((p) => value.includes(p))
            const rowSome = rowPerms.some((p) => value.includes(p)) && !rowAll
            return (
              <TableRow key={module}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
                    <span className="capitalize">{moduleLabels[module] || module}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={rowAll || (rowSome ? "indeterminate" : false)}
                    onCheckedChange={(c) => toggleRow(module, acts, !!c)}
                  />
                </TableCell>
                {ACTIONS.map((a) => (
                  <TableCell key={a} className="text-center">
                    {acts.includes(a) ? (
                      <Checkbox
                        checked={value.includes(`${module}:${a}`)}
                        onCheckedChange={(c) => toggle(`${module}:${a}`, !!c)}
                      />
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <div className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

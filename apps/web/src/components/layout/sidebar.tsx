"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Server,
  Target,
  Bug,
  FileText,
  Bot,
  Settings,
  Shield,
  LogOut,
  ScanLine,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { cn, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Clienti", icon: Users },
  { href: "/assets", label: "Asset", icon: Server },
  { href: "/assessments", label: "Assessment", icon: Target },
  { href: "/findings", label: "Findings", icon: Bug },
  { href: "/jobs", label: "Scan Jobs", icon: ScanLine },
  { href: "/reports", label: "Report", icon: FileText },
  { href: "/agents", label: "Agent Interni", icon: Bot },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold tracking-tight">ScopeGuard</span>
      </div>

      {/* Org badge */}
      {session?.user?.organizationId && (
        <div className="px-4 py-3">
          <div className="rounded-md bg-muted px-3 py-2">
            <p className="text-xs text-muted-foreground">Organizzazione</p>
            <p className="truncate text-sm font-medium">{session.user.organizationSlug ?? "—"}</p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom section */}
      <div className="space-y-1 p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Settings className="h-4 w-4" />
          Impostazioni
        </Link>

        {/* User info */}
        <div className="flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {getInitials(session?.user?.name ?? session?.user?.email ?? "U")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{session?.user?.name ?? session?.user?.email}</p>
            <p className="truncate text-xs text-muted-foreground">{session?.user?.role ?? "—"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Logout"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

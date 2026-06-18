import { Shield } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white">ScopeGuard</h1>
          <p className="text-sm text-slate-400">Vulnerability Assessment Platform</p>
        </div>
        {children}
      </div>
    </div>
  )
}

import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!session.user.organizationId) redirect("/setup")

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

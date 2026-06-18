import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token
    const path = req.nextUrl.pathname

    // Se autenticato ma senza org, redirect a setup
    if (token && !token.organizationId && path !== "/setup") {
      return NextResponse.redirect(new URL("/setup", req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname

        // Route pubbliche API (agent polling)
        if (path.startsWith("/api/agent/")) return true

        // Route auth pubbliche
        if (path.startsWith("/api/auth/")) return true

        // Richiede token JWT valido
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/assets/:path*",
    "/assessments/:path*",
    "/findings/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/agents/:path*",
    "/setup/:path*",
    "/api/organizations/:path*",
    "/api/customers/:path*",
    "/api/assets/:path*",
    "/api/assessments/:path*",
    "/api/memberships/:path*",
    "/api/findings/:path*",
    "/api/reports/:path*",
    "/api/agents/:path*",
    "/api/jobs/:path*",
  ],
}

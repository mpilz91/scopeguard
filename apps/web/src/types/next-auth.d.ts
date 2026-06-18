import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId: string | null
      organizationSlug: string | null
      role: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string
    organizationId: string | null
    organizationSlug: string | null
    role: string | null
  }
}

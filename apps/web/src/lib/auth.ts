import { NextAuthOptions, getServerSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: {
            memberships: {
              include: { organization: true },
              orderBy: { createdAt: "asc" },
              take: 1,
            },
          },
        })

        if (!user) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        const membership = user.memberships[0]

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          organizationId: membership?.organizationId ?? null,
          organizationSlug: membership?.organization?.slug ?? null,
          role: membership?.role ?? null,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.organizationId = (user as any).organizationId
        token.organizationSlug = (user as any).organizationSlug
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.userId as string
      session.user.organizationId = (token.organizationId as string) ?? null
      session.user.organizationSlug = (token.organizationSlug as string) ?? null
      session.user.role = (token.role as string) ?? null
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) throw new Error("UNAUTHORIZED")
  return session
}

export async function requireOrg() {
  const session = await requireAuth()
  if (!session.user.organizationId) throw new Error("NO_ORGANIZATION")
  return session
}

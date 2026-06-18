import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ScopeGuard — Vulnerability Assessment Platform",
  description: "Piattaforma professionale per vulnerability assessment e pentesting controllato",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

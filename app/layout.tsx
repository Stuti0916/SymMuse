import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/hooks/useAuth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SymMuse - Personal Health & Menstrual Tracker",
  description: "Track your cycles, log your moods, and connect with a supportive community",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
                <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

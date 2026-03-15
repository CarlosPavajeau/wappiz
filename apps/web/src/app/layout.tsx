import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"

import "../index.css"
import { Geist, Geist_Mono } from "next/font/google"

import Providers from "@/components/providers"

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  description: "wappiz",
  title: "wappiz",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="grid grid-rows-[auto_1fr] h-svh">{children}</div>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}

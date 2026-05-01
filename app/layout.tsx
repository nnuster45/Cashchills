import type { Metadata } from 'next'
import { Prompt } from 'next/font/google'
import './globals.css'
import { IframeLoggerInit } from '@/components/IframeLoggerInit'
import ClientProviders from '@/components/ClientProviders'

const prompt = Prompt({ subsets: ['thai', 'latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'CASHEW',
  description: 'Finance workspace for merchant income and expense tracking',
  icons: {
    icon: '/logos/cashew-app.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={prompt.className} suppressHydrationWarning>
        <IframeLoggerInit />
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}

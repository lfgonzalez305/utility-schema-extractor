import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Utility Schema Extractor',
  description: 'Iterative schema extraction and refinement for utility engineering specifications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
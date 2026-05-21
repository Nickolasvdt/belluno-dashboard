import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  style: ['normal', 'italic'],
  weight: ['400', '600', '700', '900'],
})

export const metadata: Metadata = {
  title: 'Belluno Dashboard',
  description: 'Sistema de gestão Belluno',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${playfair.variable} ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

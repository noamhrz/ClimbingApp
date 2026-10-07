import type { Viewport } from 'next'
import { Assistant, Karantina } from 'next/font/google'
import './globals.css'
import './mobile-fixes.css'
import { AuthProvider } from '@/context/AuthContext'
import ClientLayoutWrapper from './ClientLayoutWrapper'
import Footer from '@/components/Footer'

const assistant = Assistant({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '600', '700'],
  variable: '--font-assistant',
  display: 'swap',
})

const karantina = Karantina({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '700'],
  variable: '--font-karantina',
  display: 'swap',
})

export const metadata = {
  title: 'Climbing Training App',
  description: 'אפליקציית אימוני טיפוס',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F0E0C',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${karantina.variable}`}>
      <body>
        <AuthProvider>
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}

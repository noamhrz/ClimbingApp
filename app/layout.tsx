// app/layout.tsx
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import ClientLayoutWrapper from './ClientLayoutWrapper'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Climbing Training App',
  description: 'אפליקציית אימוני טיפוס',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <AuthProvider>
          <ClientLayoutWrapper>
            {children}
          </ClientLayoutWrapper>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
import './globals.css'
import { UserProvider } from '@/context/UserContext'
import ClientLayoutWrapper from './ClientLayoutWrapper'

export const metadata = {
  title: 'Climbing Training App',
  description: 'אפליקציית אימוני טיפוס',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>
        <UserProvider>
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        </UserProvider>
      </body>
    </html>
  )
}

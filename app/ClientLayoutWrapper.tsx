'use client'

import { useAuth } from '@/context/AuthContext'
import Footer from '@/components/Footer'

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  )
}
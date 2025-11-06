'use client'

import { usePathname } from 'next/navigation'
import UserHeader from '@/components/UserHeader'

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Don't show header on login page
  const showHeader = pathname !== '/'

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      {showHeader && <UserHeader />}
      <main className="flex-grow">{children}</main>
    </div>
  )
}
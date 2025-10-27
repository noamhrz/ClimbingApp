'use client'

import { useUserContext } from '@/context/UserContext'
import AdminFooter from '@/components/AdminFooter'

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { selectedUser } = useUserContext()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <main className="flex-grow">{children}</main>
      {selectedUser?.role === 'Admin' && <AdminFooter />} {/* ✅ רק אדמין */}
    </div>
  )
}

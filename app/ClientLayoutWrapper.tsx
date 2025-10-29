'use client'

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
      <main className="flex-grow">{children}</main>
    </div>
  )
}
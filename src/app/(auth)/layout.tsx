import React from 'react'
import { KaboreLogo } from '@/components/layout/logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <KaboreLogo variant="wordmark" collapsed={false} />
          <p className="text-text-secondary text-sm mt-2 text-center">
            Gestão para estúdios de estética automotiva
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}

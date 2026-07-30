'use client'

import React from 'react'

interface KaboreLogoProps {
  collapsed?: boolean
  variant?: 'wordmark' | 'image'
}

export function KaboreLogo({ collapsed = false, variant = 'wordmark' }: KaboreLogoProps) {
  if (variant === 'image') {
    return collapsed ? (
      <img
        src="/icon-owl.png"
        alt="Kaboré OS"
        className="w-full h-full object-contain p-1.5"
      />
    ) : (
      <div className="flex items-center justify-center w-full h-full overflow-hidden">
        <img
          src="/logo-owl.png"
          alt="Kaboré OS"
          className="h-60 w-auto block shrink-0"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <img
        src="/icon-owl.png"
        alt="Kaboré OS"
        className="w-10 h-10 object-contain shrink-0"
      />
      {!collapsed && (
        <span className="font-oswald font-semibold text-3xl tracking-wide whitespace-nowrap leading-none">
          <span className="text-text-primary">Kaboré</span>
          <span className="text-accent">OS</span>
        </span>
      )}
    </div>
  )
}

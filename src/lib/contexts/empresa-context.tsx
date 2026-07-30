"use client"

import React, { createContext, useContext } from 'react'

interface EmpresaContextType {
  empresaId: string | null
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined)

export function EmpresaProvider({
  children,
  empresaId,
}: {
  children: React.ReactNode
  empresaId: string | null
}) {
  return (
    <EmpresaContext.Provider value={{ empresaId }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  const context = useContext(EmpresaContext)
  if (context === undefined) {
    throw new Error('useEmpresa must be used within an EmpresaProvider')
  }
  return context
}

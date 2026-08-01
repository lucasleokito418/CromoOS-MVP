"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log para monitoramento futuro (ex: Sentry)
    console.error("[GlobalError]", error)
  }, [error])

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card>
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertTriangle size={28} className="text-danger" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-lg font-semibold text-text-primary font-oswald">
                Algo deu errado
              </h1>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs">
                Ocorreu um erro inesperado. Tente novamente — se o problema
                persistir, entre em contato com o suporte.
              </p>
            </div>

            {error.digest && (
              <p className="text-[10px] text-text-secondary font-mono bg-surface px-3 py-1 rounded border border-border">
                ID: {error.digest}
              </p>
            )}

            <Button variant="primary" onClick={reset}>
              Tentar novamente
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

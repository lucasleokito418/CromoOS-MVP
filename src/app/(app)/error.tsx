"use client"

import { useEffect } from "react"
import { AlertTriangle, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    // Log para monitoramento futuro (ex: Sentry)
    console.error("[AppError]", error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
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
                Não foi possível carregar esta seção. Você pode tentar novamente
                ou voltar ao painel principal.
              </p>
            </div>

            {error.digest && (
              <p className="text-[10px] text-text-secondary font-mono bg-surface px-3 py-1 rounded border border-border">
                ID: {error.digest}
              </p>
            )}

            <div className="flex gap-3">
              <Button
                variant="secondary"
                iconLeft={<ArrowLeft size={14} />}
                onClick={() => router.push("/assistente")}
              >
                Ir ao Painel
              </Button>
              <Button variant="primary" onClick={reset}>
                Tentar novamente
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

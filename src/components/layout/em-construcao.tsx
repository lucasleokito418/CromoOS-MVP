"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyStateIllustration } from "@/components/ui/empty-state-illustration";
import { Button } from "@/components/ui/button";

interface EmConstrucaoProps {
  titulo: string;
  bloco?: number | string;
}

export function EmConstrucao({ titulo, bloco }: EmConstrucaoProps) {
  const mensagem = bloco
    ? `Este módulo chega no Bloco ${bloco}`
    : "Este módulo está em planejamento para uma versão futura";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader
        title={titulo}
        subtitle="Módulo em desenvolvimento"
        helpTooltip={`Informações sobre a tela de ${titulo}`}
      />

      <Card padding="p-12">
        <div className="flex flex-col items-center justify-center text-center gap-4">
          <EmptyStateIllustration size={120} />
          
          <div className="flex flex-col gap-1.5 mt-2">
            <h2 className="text-lg font-semibold text-text-primary">
              Página em Construção
            </h2>
            <p className="text-sm text-text-secondary max-w-md">
              {mensagem}. Estamos preparando esta funcionalidade com o design system do Kaboré OS.
            </p>
          </div>

          <div className="mt-4">
            <Link href="/painel">
              <Button variant="secondary" iconLeft={<ArrowLeft size={16} />}>
                Voltar para o Painel
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

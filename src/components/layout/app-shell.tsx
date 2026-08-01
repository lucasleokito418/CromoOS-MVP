"use client";

import React, { useState } from "react";
import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarSection } from "@/components/layout/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { EmpresaProvider } from "@/lib/contexts/empresa-context";
import { ToastProvider } from "@/components/ui/toast";
import { KaboreLogo } from "@/components/layout/logo";
import { createClient } from "@/lib/supabase/client";

interface AppShellProps {
  userDisplayName: string;
  userEmail: string;
  empresaId: string | null;
  navSections: SidebarSection[];
  children: React.ReactNode;
}

export function AppShell({
  userDisplayName,
  userEmail,
  empresaId,
  navSections,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-canvas">
      {/* Topbar Mobile (fixo no topo em telas < md) */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-sidebar border-b border-border md:hidden shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            aria-label="Abrir menu de navegação"
          >
            <Menu size={20} />
          </button>
          <KaboreLogo variant="wordmark" />
        </div>
      </header>

      {/* Sidebar (Overlay no mobile, Fixa/Retrátil no Desktop) */}
      <Sidebar
        sections={navSections}
        activeKey="painel"
        logoSlot={<KaboreLogo variant="image" />}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        bottomSlot={
          <div className="flex items-center gap-2.5 px-1 min-w-0 w-full">
            <Avatar name={userDisplayName} size="sm" />
            <div className="flex flex-col min-w-0 flex-1 sidebar-user-info">
              <span className="text-xs font-medium text-text-primary truncate">
                {userDisplayName}
              </span>
              <span className="text-[10px] text-text-secondary truncate">
                {userEmail}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair"
              aria-label="Encerrar sessão"
              className="ml-auto shrink-0 p-1.5 rounded text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        }
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <ToastProvider>
          <EmpresaProvider empresaId={empresaId}>
            {children}
          </EmpresaProvider>
        </ToastProvider>
      </main>
    </div>
  );
}


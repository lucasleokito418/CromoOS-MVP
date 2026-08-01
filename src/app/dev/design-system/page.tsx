"use client";

import React, { useState } from "react";
import {
  Calendar,
  Users,
  BarChart2,
  Settings,
  DollarSign,
  ShoppingBag,
  Bell,
  Scissors,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox, Toggle } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, Column } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { Drawer } from "@/components/ui/drawer";
import { Modal } from "@/components/ui/modal";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { Sidebar, SidebarSection } from "@/components/layout/sidebar";
import { KaboreLogo } from "@/components/layout/logo";

// ---------- Data ----------

type Row = { id: string; nome: string; status: string; valor: number; data: string };

const tableData: Row[] = [
  { id: "1", nome: "Maria Silva", status: "Confirmado", valor: 150, data: "2026-07-10" },
  { id: "2", nome: "João Santos", status: "Pendente", valor: 80, data: "2026-07-11" },
  { id: "3", nome: "Ana Oliveira", status: "Cancelado", valor: 200, data: "2026-07-12" },
  { id: "4", nome: "Pedro Costa", status: "Confirmado", valor: 120, data: "2026-07-13" },
  { id: "5", nome: "Carla Lima", status: "Pendente", valor: 90, data: "2026-07-14" },
];

const tableColumns: Column<Row>[] = [
  { key: "nome", label: "Cliente", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (row) => {
      const v = { Confirmado: "success", Pendente: "warning", Cancelado: "danger" } as const;
      return <Badge variant={v[row.status as keyof typeof v] ?? "neutral"}>{row.status}</Badge>;
    },
  },
  {
    key: "valor",
    label: "Valor",
    sortable: true,
    align: "right",
    render: (row) => (
      <span className="tabular-nums">
        {row.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </span>
    ),
  },
  { key: "data", label: "Data", sortable: true },
];

const sidebarSections: SidebarSection[] = [
  {
    title: "Principal",
    items: [
      { key: "agenda", label: "Agenda", icon: <Calendar size={18} /> },
      { key: "clientes", label: "Clientes", icon: <Users size={18} /> },
      { key: "financeiro", label: "Financeiro", icon: <DollarSign size={18} /> },
      { key: "vendas", label: "Vendas", icon: <ShoppingBag size={18} /> },
    ],
  },
  {
    title: "Gestão",
    items: [
      { key: "relatorios", label: "Relatórios", icon: <BarChart2 size={18} /> },
      { key: "notificacoes", label: "Notificações", icon: <Bell size={18} /> },
      { key: "configuracoes", label: "Configurações", icon: <Settings size={18} /> },
    ],
  },
];

// ---------- Inner showcase (needs useToast, so must be inside ToastProvider) ----------

function ShowcaseInner() {
  const { toast } = useToast();
  const [activeNav, setActiveNav] = useState("agenda");
  const [activeTab, setActiveTab] = useState("resumo");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [toggled, setToggled] = useState(true);
  const [selectVal, setSelectVal] = useState("");
  const [loading, setLoading] = useState(false);

  const fakeLoad = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ variant: "success", title: "Ação concluída!", description: "Tudo certo por aqui." });
    }, 1800);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Sidebar */}
      <Sidebar
        sections={sidebarSections}
        activeKey={activeNav}
        onSelect={setActiveNav}
        logoSlot={<KaboreLogo variant="image" />}
        bottomSlot={
          <div className="flex items-center gap-2.5 px-1">
            <Avatar name="Admin User" size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-text-primary truncate">Admin User</span>
              <span className="text-[10px] text-text-secondary truncate">admin@kabore.os</span>
            </div>
          </div>
        }
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Page header */}
        <div className="sticky top-0 z-10 bg-canvas border-b border-border px-10 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-oswald font-semibold text-2xl text-text-primary tracking-wide">
              Design System
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Bloco 2 — showcase visual de componentes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">dev only</Badge>
            <Avatar name="Aurea Teixeira" size="sm" />
          </div>
        </div>

        <div className="px-10 py-10 flex flex-col gap-12 max-w-5xl">

          {/* ── Buttons ── */}
          <Section title="Button">
            <div className="flex flex-wrap gap-3 items-center">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" loading={loading} onClick={fakeLoad}>
                {loading ? "Carregando" : "Loading demo"}
              </Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </Section>

          {/* ── Inputs ── */}
          <Section title="Input / Textarea">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input label="Nome do cliente" placeholder="Ex: Maria Silva" hint="Nome completo" />
              <Input label="E-mail" placeholder="email@exemplo.com" type="email" />
              <Input label="Com erro" placeholder="Digite algo" error="Campo obrigatório" />
              <Input label="Desabilitado" placeholder="Não editável" disabled />
              <div className="col-span-2">
                <Textarea label="Observações" placeholder="Notas internas..." hint="Máximo 500 caracteres" />
              </div>
            </div>
          </Section>

          {/* ── Select ── */}
          <Section title="Select (custom)">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select
                label="Status"
                value={selectVal}
                onChange={setSelectVal}
                options={[
                  { value: "ativo", label: "Ativo" },
                  { value: "inativo", label: "Inativo" },
                  { value: "pendente", label: "Pendente" },
                ]}
                placeholder="Selecione o status"
              />
              <Select
                label="Serviço (com busca)"
                value=""
                onChange={() => { }}
                searchable
                options={[
                  { value: "corte", label: "Corte de cabelo" },
                  { value: "coloracao", label: "Coloração" },
                  { value: "escova", label: "Escova progressiva" },
                  { value: "manicure", label: "Manicure" },
                  { value: "pedicure", label: "Pedicure" },
                ]}
                placeholder="Busque o serviço"
              />
            </div>
          </Section>

          {/* ── Checkbox + Toggle ── */}
          <Section title="Checkbox & Toggle">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-6 items-center">
                <Checkbox label="Não selecionado" checked={false} onChange={() => { }} />
                <Checkbox label="Selecionado" checked={checked} onChange={setChecked} />
                <Checkbox label="Desabilitado" checked disabled />
              </div>
              <div className="flex flex-wrap gap-6 items-start">
                <Toggle
                  label="Notificações"
                  description="Receber alertas por e-mail"
                  checked={toggled}
                  onChange={setToggled}
                />
                <Toggle label="Modo offline" checked={false} onChange={() => { }} />
                <Toggle label="Desabilitado" checked disabled />
              </div>
            </div>
          </Section>

          {/* ── Badges ── */}
          <Section title="Badge">
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="success">Confirmado</Badge>
              <Badge variant="warning">Pendente</Badge>
              <Badge variant="danger">Cancelado</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="neutral">Neutro</Badge>
            </div>
          </Section>

          {/* ── Avatar ── */}
          <Section title="Avatar">
            <div className="flex flex-wrap gap-4 items-center">
              <Avatar name="Maria Silva" size="sm" />
              <Avatar name="João Santos" size="md" />
              <Avatar name="Ana Oliveira" size="lg" />
              <Avatar name="Pedro Costa" size="sm" />
              <Avatar name="Carla Lima" size="md" />
            </div>
          </Section>

          {/* ── Tooltip ── */}
          <Section title="Tooltip">
            <div className="flex flex-wrap gap-6 items-center">
              <Tooltip content="Dica no lado direito" placement="right">
                <Button variant="secondary">Hover (right)</Button>
              </Tooltip>
              <Tooltip content="Dica acima" placement="top">
                <Button variant="secondary">Hover (top)</Button>
              </Tooltip>
              <Tooltip content="Dica abaixo" placement="bottom">
                <Button variant="secondary">Hover (bottom)</Button>
              </Tooltip>
            </div>
          </Section>

          {/* ── Card ── */}
          <Section title="Card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card>
                <p className="text-sm text-text-secondary">Card simples sem header/footer.</p>
              </Card>
              <Card
                header={
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text-primary">Receita do mês</h3>
                    <Badge variant="success">+12%</Badge>
                  </div>
                }
                footer={
                  <Button variant="ghost" size="sm">
                    Ver detalhes
                  </Button>
                }
              >
                <p className="tabular-nums text-3xl font-semibold text-text-primary">
                  R$ 18.450,00
                </p>
                <p className="text-xs text-text-secondary mt-1">Julho 2026</p>
              </Card>
            </div>
          </Section>

          {/* ── Tabs ── */}
          <Section title="Tabs">
            <Tabs
              tabs={[
                { key: "resumo", label: "Resumo" },
                { key: "movimentacoes", label: "Movimentações" },
                { key: "pendencias", label: "Pendências" },
                { key: "relatorio", label: "Relatório", disabled: true },
              ]}
              activeKey={activeTab}
              onChange={setActiveTab}
            />
            <div className="mt-4 text-sm text-text-secondary">
              Aba ativa: <strong className="text-text-primary">{activeTab}</strong>
            </div>
          </Section>

          {/* ── Table ── */}
          <Section title="Table (com paginação e ordenação)">
            <Table
              columns={tableColumns}
              data={tableData}
              rowKey="id"
              paginated
              pageSize={3}
              emptyMessage="Nenhum agendamento encontrado"
            />
          </Section>

          {/* ── Drawer ── */}
          <Section title="Drawer">
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              Abrir Drawer
            </Button>
            <Drawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              title="Editar agendamento"
              subtitle="ID #2024 · Maria Silva"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setDrawerOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setDrawerOpen(false);
                      toast({ variant: "success", title: "Agendamento salvo!" });
                    }}
                  >
                    Salvar
                  </Button>
                </>
              }
            >
              <div className="flex flex-col gap-5">
                <Input label="Nome do cliente" defaultValue="Maria Silva" />
                <Select
                  label="Serviço"
                  value="corte"
                  onChange={() => { }}
                  options={[
                    { value: "corte", label: "Corte de cabelo" },
                    { value: "coloracao", label: "Coloração" },
                  ]}
                />
                <Input label="Data" type="date" defaultValue="2026-07-10" />
                <Toggle label="Pagamento confirmado" checked={true} onChange={() => { }} description="Gera venda automaticamente" />
                <Textarea label="Observações" placeholder="Notas internas..." />
              </div>
            </Drawer>
          </Section>

          {/* ── Modal ── */}
          <Section title="Modal (confirmação)">
            <Button variant="destructive" onClick={() => setModalOpen(true)}>
              Abrir Modal de Confirmação
            </Button>
            <Modal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Excluir agendamento?"
              footer={
                <>
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setModalOpen(false);
                      toast({ variant: "error", title: "Registro excluído", description: "Ação não pode ser desfeita." });
                    }}
                  >
                    Excluir
                  </Button>
                </>
              }
            >
              Tem certeza que deseja excluir o agendamento de{" "}
              <strong className="text-text-primary">Maria Silva</strong> em{" "}
              <strong className="text-text-primary">10/07/2026</strong>? Esta ação não pode ser
              desfeita.
            </Modal>
          </Section>

          {/* ── Toast ── */}
          <Section title="Toast">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() =>
                  toast({ variant: "success", title: "Sucesso!", description: "Operação realizada." })
                }
              >
                Success
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast({ variant: "error", title: "Erro!", description: "Algo deu errado." })
                }
              >
                Error
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast({ variant: "warning", title: "Atenção!", description: "Verifique os dados." })
                }
              >
                Warning
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast({ variant: "info", title: "Info", description: "Nova atualização disponível." })
                }
              >
                Info
              </Button>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <ToastProvider>
      <ShowcaseInner />
    </ToastProvider>
  );
}